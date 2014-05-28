(function($, _, global) {
    var body = null,
        selectorBuildTitle = '.build-title',
        selectorBuildStatusText = '.build-status-text',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildDuration = '.build-duration',
        selectorBuildTemplate = '#build-template',
        selectorAlarm = '#alarm-sound',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed',
        classBuildRunning = 'build-running',

        allBuildTypes = [],

        POLLING_INTERVAL_BUILD_STATUS_INFO = 7000,
        POLLING_INTERVAL_BUILD_CHANGES_INFO = 15000,
        POLLING_INTERVAL_BUILD_RUNNING_INFO = 3000,

        DATETIME_REGEXP = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\+\d{4}/;


    function resetCustomColor(el) {
        el.css('background-color', '');
    }


    function teamcityStringToDate(stringDatetime) {
        var elements = DATETIME_REGEXP.exec(stringDatetime).slice(1);

        return new Date(elements[0], elements[1], elements[2],
                        elements[3], elements[4], elements[5])
    }

    function getBuildDuration(startDatetime, endDatetime) {
        /*
        Calculate diff between 2 datetimes.
        Return string in form: 'XX min : YY sec'.
        */

        var duration = new Date(teamcityStringToDate(endDatetime) -
                                teamcityStringToDate(startDatetime));

        return [duration.getMinutes(), 'min', ':',
                duration.getSeconds(), 'sec'].join(' ');
    }


    function playAlarm() {
        (new Howl({urls: ['static/alarm.mp3']})).play();
    }


    function setupBuildsPolling() {
        /*
        Setup timers for polling build changes.
        */

        global.setInterval(updateBuildStatusInfo,
                           POLLING_INTERVAL_BUILD_STATUS_INFO);
        global.setInterval(updateBuildChangesInfo,
                           POLLING_INTERVAL_BUILD_CHANGES_INFO);
        global.setInterval(updateBuildRunningInfo,
                           POLLING_INTERVAL_BUILD_RUNNING_INFO);
    }


    function layoutBuilds() {
        /*
        Generates DOM elements for each build and updates builds info.
        */

        function onGetConfigSuccess(data) {
            var buildTemplate = _.template($(selectorBuildTemplate).html());

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
            updateBuildRunningInfo();

            setupBuildsPolling();
        }

        function onGetConfigError(xhr, type) {
            body.html('Error: unable to initialize builds')
        }

        $.ajax({
            type: 'GET',
            sync: true,
            url: '/config/',
            error: onGetConfigError,
            success: onGetConfigSuccess
        });
    }


    function updateBuildRunningInfo() {
        function onGetBuildRunningInfoSuccess(data) {;
            var el = $('#' + this.buildTypeId, body),
                buildRunning = Boolean(data.count);

            if (buildRunning) {
                data = data.build[0];

                el.removeClass(classBuildSuccess).removeClass(classBuildFailed);
                resetCustomColor(el);
                el.addClass(classBuildRunning);
                el.find(selectorBuildStatusText).hide();
                el.find('progress').val(data.percentageComplete).show();
            } else {
                el.removeClass(classBuildRunning);
                el.find(selectorBuildStatusText).show();
                el.find('progress').hide();
            }
        }

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                url: '/running_builds/?buildTypeId=' + buildTypeId,
                context: {'buildTypeId': buildTypeId},
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
            var el = $('#' + this.buildTypeId, body),
                commiter = data.user ? data.user.name : data.username;

            el.find(selectorBuildTriggeredBy).html(commiter);
        }

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                url: '/build_changes/?buildTypeId=' + buildTypeId,
                context: {'buildTypeId': buildTypeId},
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
            var el = $('#' + this.buildTypeId, body),
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
                el.removeClass(classBuildSuccess).addClass(classBuildFailed);
                playAlarm();
            }

            el.find(selectorBuildTitle).html(data.buildType.name);
            el.find(selectorBuildStatusText).html(data.statusText);
            el.find(selectorBuildDuration).html(getBuildDuration(data.startDate,
                                                                 data.finishDate));
        }

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                url: '/build_type/?buildTypeId=' + buildTypeId,
                context: {'buildTypeId': buildTypeId},
                success: onGetBuildStatusInfoSuccess
            });
        });
    }


    $(document).ready(function() {
        body = $('body');
        layoutBuilds();
    });

})(Zepto, _, window);