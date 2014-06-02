(function($, _, global) {
    var selectorBuildTitle = '.build-title',
        selectorBuildStatusText = '.build-status-text',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildDuration = '.build-duration',
        selectorBuildTemplate = '#build-template',
        selectorAlarm = '#alarm-sound',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed',
        classBuildRunning = 'build-running',
        classBuildContainer = 'build-container',

        allBuildTypes = [],

        POLLING_INTERVAL_BUILD_STATUS_INFO = 7000,
        POLLING_INTERVAL_BUILD_CHANGES_INFO = 15000,
        POLLING_INTERVAL_BUILD_RUNNING_INFO = 3000,

        DATETIME_REGEXP = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\+\d{4}/;


    function resetCustomColor(el) {
        el.style.background = '';
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
            var body = document.body,
                buildContainer = null,
                templateHTML = document.querySelector(selectorBuildTemplate).innerHTML,
                buildTemplate = _.template(templateHTML);

            _.each(data.buildsLayout, function(row) {
                _.each(row, function(buildType) {
                    allBuildTypes.push(buildType.id);

                    buildContainer = document.createElement('div');
                    buildContainer.classList.add(classBuildContainer);
                    buildContainer.innerHTML = buildTemplate(buildType);
                    body.appendChild(buildContainer);
                });
                body.appendChild(document.createElement('br'));
            });

            // immediately update builds info
            updateBuildStatusInfo();
            updateBuildChangesInfo();
            updateBuildRunningInfo();

            setupBuildsPolling();
        }

        function onGetConfigError(xhr, type) {
            document.write('Error: unable to initialize builds')
        }

        $.ajax({
            type: 'GET',
            sync: true,
            cache: false,
            url: '/config/',
            error: onGetConfigError,
            success: onGetConfigSuccess
        });
    }


    function updateBuildRunningInfo() {
        function onGetBuildRunningInfoSuccess(data) {;
            var el = document.querySelector('#' + this.buildTypeId),
                buildRunning = Boolean(data.count);

            if (buildRunning) {
                data = data.build[0];

                el.classList.remove(classBuildSuccess);
                el.classList.remove(classBuildFailed);
                resetCustomColor(el);
                el.classList.add(classBuildRunning);

                el.querySelector(selectorBuildStatusText).style.display = 'none';
                el.querySelector('progress').setAttribute('value', data.percentageComplete);
                el.querySelector('progress').style.display = '';
            } else {
                el.classList.remove(classBuildRunning);
                el.querySelector(selectorBuildStatusText).style.display = '';
                el.querySelector('progress').style.display = 'none';
            }
        }

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                cache: false,
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
            var el = document.querySelector('#' + this.buildTypeId),
                commiter = data.user ? data.user.name : data.username;

            el.querySelector(selectorBuildTriggeredBy).innerHTML = commiter;
        }

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                cache: false,
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
            var el = document.querySelector('#' + data.buildType.id),
                buildSuccess = data.status == 'SUCCESS';

            // do not update status for running build
            if (el.classList.contains(classBuildRunning)) {
                return;
            }

            if (buildSuccess) {
                if (el.classList.contains(classBuildFailed)) {
                    el.classList.remove(classBuildFailed);
                    resetCustomColor(el);
                    el.classList.add(classBuildSuccess);
                } else if (!el.classList.contains(classBuildSuccess) &&
                           !el.classList.contains(classBuildFailed)) {
                    el.classList.add(classBuildSuccess);
                }
            } else if (!buildSuccess && !el.classList.contains(classBuildFailed)) {
                el.classList.remove(classBuildSuccess);
                el.classList.add(classBuildFailed);
                playAlarm();
            }

            el.querySelector(selectorBuildTitle).innerHTML = data.buildType.name;
            el.querySelector(selectorBuildStatusText).innerHTML = data.statusText;
            el.querySelector(selectorBuildDuration).innerHTML = getBuildDuration(
                data.startDate, data.finishDate);
        }

        _.each(allBuildTypes, function(buildTypeId) {
            $.ajax({
                type: 'GET',
                sync: false,
                cache: false,
                url: '/build_type/?buildTypeId=' + buildTypeId,
                success: onGetBuildStatusInfoSuccess
            });
        });
    }


    $(document).ready(function() {
        layoutBuilds();
    });

})(jQuery, _, window);