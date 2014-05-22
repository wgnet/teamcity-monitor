(function($, _, global) {
    var selectorBuildTitle = '.build-title',
        selectorBuildStatusText = '.build-status-text',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildRevision = '.build-revision',
        selectorBuildTemplate = '#build-template',
        selectorBuildPercentages = '.build-percentages',
        selectorAlarm = '#alarm-sound',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed',
        classBuildRunning = 'build-running',

        allBuildTypes = [],

        COLOR_RED = 'rgb(255, 69, 0)',
        COLOR_GRAY = 'rgb(220, 220, 220)',

        POLLING_INTERVAL_BUILD_STATUS_INFO = 8000,
        POLLING_INTERVAL_BUILD_CHANGES_INFO = 10000,
        POLLING_INTERVAL_BUILD_RUNNING_INFO = 3000,
        POLLING_INTERVAL_BUILD_BLINKING = 1000;


    function resetCustomColor(el) {
        el.css('background-color', '');
    }


    function setupBuildsPolling() {
        /*
        Setup timers for polling build changes.
        */

        global.setInterval(updateBuildStatusInfo,
                           POLLING_INTERVAL_BUILD_STATUS_INFO);
        //global.setInterval(updateBuildChangesInfo,
        //                   POLLING_INTERVAL_BUILD_CHANGES_INFO);
        global.setInterval(updateBuildRunningInfo,
                           POLLING_INTERVAL_BUILD_RUNNING_INFO);
        global.setInterval(blinkFailedBuilds,
                           POLLING_INTERVAL_BUILD_BLINKING);
    }


    function blinkFailedBuilds() {
        /*
        Blink failed builds.
        */

        for (var i=0, buildsCount=allBuildTypes.length; i<buildsCount; i++) {
            var el = $('#' + allBuildTypes[i]);

            if (!el.hasClass(classBuildFailed)) {
                continue;
            }

            if (el.css('background-color') == COLOR_RED) {
                el.css('background-color', COLOR_GRAY);
            } else {
                el.css('background-color', COLOR_RED);
            }
        }
    }


    function layoutBuilds() {
        /*
        Generates DOM elements for each build and updates builds info.
        */

        $.ajax({
            type: 'GET',
            sync: true,
            url: '/config/',
            error: onGetConfigError,
            success: onGetConfigSuccess
        });

        function onGetConfigSuccess(data) {
            var body = $('body'),
                buildTemplate = _.template($(selectorBuildTemplate).html());

            _.each(data.buildsLayout, function(row) {
                _.each(row, function(buildType) {
                    allBuildTypes.push(buildType.id);
                    body.append(buildTemplate(buildType));
                });
                body.append($('<br/>'));
            });

            // immediately update builds info
            updateBuildStatusInfo();
            updateBuildChangesInfo();

            setupBuildsPolling()
        }

        function onGetConfigError(xhr, type) {
            $('body').html('Error: unable to initialize builds')
        }
    }


    function updateBuildRunningInfo() {
        function onGetBuildRunningInfoSuccess(data) {;
            var el = $('#' + this.buildTypeId),
                buildRunning = Boolean(data.count);

            if (buildRunning) {
                data = data.build[0];

                el.removeClass(classBuildSuccess).removeClass(classBuildFailed);
                resetCustomColor(el);
                el.addClass(classBuildRunning);
                el.find(selectorBuildPercentages).html('(' + data.percentageComplete + '%)');
            } else {
                el.removeClass(classBuildRunning);
                el.find(selectorBuildPercentages).html('');
            }
        }

        function onGetBuildRunningInfoError(xhr, type) {}

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                url: '/running_builds/?buildTypeId=' + buildTypeId,
                context: {'buildTypeId': buildTypeId},
                error: onGetBuildRunningInfoError,
                success: onGetBuildRunningInfoSuccess
            });
        });
    }


    function updateBuildChangesInfo() {
        /*
        Requests build changes info and updates corresponding DOM element with
        changes info.
        */

        function onGetBuildChangesInfoSuccess(data) {
            var el = $('#' + this.buildTypeId),
                commiter = data.user ? data.user.name : data.username;

            el.find(selectorBuildTriggeredBy).html(commiter);
            el.find(selectorBuildRevision).html(data.version);
        }

        function onGetBuildChangesInfoError(xhr, type) {}

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                url: '/build_changes/?buildTypeId=' + buildTypeId,
                context: {'buildTypeId': buildTypeId},
                error: onGetBuildChangesInfoError,
                success: onGetBuildChangesInfoSuccess
            });
        });
    }


    function updateBuildStatusInfo() {
        /*
        Requests buildType info and updates corresponding DOM element with
        build name, status, statusText.
        */

        function onGetBuildStatusInfoSuccess(data) {
            var el = $('#' + this.buildTypeId),
                buildSuccess = data.status == 'SUCCESS';

            // do not update status for running build
            if (el.hasClass(classBuildRunning)) {
                return;
            }

            if (buildSuccess) {
                if (el.hasClass(classBuildFailed)) {
                    el.removeClass(classBuildFailed);
                    resetCustomColor(el);
                    el.addClass(classBuildSuccess);
                } else if (!el.hasClass(classBuildSuccess) && !el.hasClass(classBuildFailed)) {
                    el.addClass(classBuildSuccess);
                }
            } else if (!buildSuccess && !el.hasClass(classBuildFailed)) {
                // play alarm here
                el.removeClass(classBuildSuccess).addClass(classBuildFailed);
            }

            el.find(selectorBuildTitle).html(data.buildType.name);
            el.find(selectorBuildStatusText).html(data.statusText);
        }

        function onGetBuildStatusInfoError(xhr, type) {}

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                url: '/build_type/?buildTypeId=' + buildTypeId,
                context: {'buildTypeId': buildTypeId},
                error: onGetBuildStatusInfoError,
                success: onGetBuildStatusInfoSuccess
            });
        });
    }


    $(document).ready(function() {
        layoutBuilds();
    });

})(Zepto, _, window);