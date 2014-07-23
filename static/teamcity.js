(function($, _, global) {
    var selectorBuildTitle = '.build-title',
        selectorBuildStatusText = '.build-status-text',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildDuration = '.build-duration',
        selectorBuildTemplate = 'build-template',
        selectorBuildCoverage = '.build-coverage',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed',
        classBuildRunning = 'build-running',
        classBuildContainer = 'build-container',

        POLLING_INTERVAL_BUILD_STATUS_INFO = 7000,
        POLLING_INTERVAL_BUILD_CHANGES_INFO = 15000,
        POLLING_INTERVAL_BUILD_RUNNING_INFO = 3000,
        POLLING_INTERVAL_BUILD_STATISTICS_INFO = 15000,

        DATETIME_REGEXP = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\+\d{4}/;


    function resetCustomColor(el) {
        el.style.background = '';
    }


    function updateCoverageInfo(el, data) {
        var coverageProperty = _.find(data.property, function(property) {
            return property.name == 'CodeCoverageL';
        });

        el.querySelector(selectorBuildCoverage).innerHTML = Math.round(
            coverageProperty.value, 2).toString() + '%';
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
        /*
        Play alarm sound when build failed.
        */

        (new Howl({urls: ['static/alarm.mp3']})).play();
    }

    function layoutBuilds() {
        /*
        Requests build types config.
        */

        $.ajax({
            async: false,
            cache: false,
            url: '/config/',
            success: onGetConfigSuccess,
            error: onGetConfigError
        });
    }

    function updateBuildRunningInfo() {
        /*
        Requests build running info for each buildTypeId.
        */

        $.ajax({
            cache: false,
            url: '/running_builds/',
            success: onGetBuildRunningInfoSuccess
        });
    }

    function updateBuildChangesInfo() {
        /*
        Requests build changes info for each buildTypeId.
        */

        $.ajax({
            cache: false,
            url: '/build_changes/',
            success: onGetBuildChangesInfoSuccess
        });
    }

    function updateBuildStatusInfo() {
        /*
        Requests build status info for each buildTypeId.
        */

        $.ajax({
            cache: false,
            url: '/build_type/',
            success: onGetBuildStatusInfoSuccess
        });
    }

    function updateBuildStatisticsInfo() {
        /*
        Requests build statistics info for each buildTypeId.
        */

        $.ajax({
            cache: false,
            url: '/build_statistics/',
            success: onGetBuildStatisticsInfoSuccess
        });
    }


    // AJAX handlers

    function onGetBuildStatusInfoSuccess(response) {
        console.log('Updating build status info ...');

        _.each(response, function(data, buildTypeId) {
            var el = document.getElementById(buildTypeId),
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
        });

        global.setTimeout(updateBuildStatusInfo, POLLING_INTERVAL_BUILD_STATUS_INFO);
    }

    function onGetBuildChangesInfoSuccess(response) {
        console.log('Updating build changes info ...');

        _.each(response, function(data, buildTypeId) {
            var el = document.getElementById(buildTypeId),
                commiter = data.user ? data.user.name : data.username;

            el.querySelector(selectorBuildTriggeredBy).innerHTML = commiter;
        });

        global.setTimeout(updateBuildChangesInfo, POLLING_INTERVAL_BUILD_CHANGES_INFO);
    }

    function onGetBuildRunningInfoSuccess(response) {
        console.log('Updating build running info ...');

        _.each(response, function(data, buildTypeId) {
            var el = document.getElementById(buildTypeId),
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
        });

        global.setTimeout(updateBuildRunningInfo, POLLING_INTERVAL_BUILD_RUNNING_INFO);
    }

    function onGetBuildStatisticsInfoSuccess(response) {
        console.log('Updating build statistics info ...');

        _.each(response, function(data, buildTypeId) {
            var el = document.getElementById(buildTypeId);

            updateCoverageInfo(el, data);
        });

        global.setTimeout(updateBuildStatisticsInfo, POLLING_INTERVAL_BUILD_STATISTICS_INFO)
    }

    function onGetConfigError(jqXHR, textStatus, errorThrown) {
        document.write('Error: unable to initialize builds');
    }

    function onGetConfigSuccess(data) {
        var body = document.body,
            buildContainer = null,
            templateHTML = document.getElementById(selectorBuildTemplate).innerHTML,
            buildTemplate = _.template(templateHTML);

        _.each(data.buildsLayout, function(row) {
            _.each(row, function(buildType) {
                buildContainer = document.createElement('div');
                buildContainer.classList.add(classBuildContainer);
                buildContainer.innerHTML = buildType.id ? buildTemplate(buildType): '';
                body.appendChild(buildContainer);
            });
            body.appendChild(document.createElement('br'));
        });

        // immediately update builds info
        updateBuildStatusInfo();
        updateBuildChangesInfo();
        updateBuildRunningInfo();
        updateBuildStatisticsInfo();
    }


    $(document).ready(layoutBuilds);

})(Zepto, _, window);
