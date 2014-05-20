(function($, _, global) {
    var selectorBuildTitle = '.build-title',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildStatusText = '.build-status-text',
        selectorBuildTemplate = '#build-template',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed';


    function generateBuildTypeUrl(buildTypeId) {
        return '/build_type/?buildTypeId=' + buildTypeId;
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

            _.each(data.buildMatrix, function(row) {
                _.each(row, function(build) {
                    body.append(buildTemplate(build));
                    updateBuildInfo(build.id);
                });
                body.append($('<br/>'));
            });
        }

        function onGetConfigError(xhr, type) {
            $('body').html('Error: unable to initialize builds')
        }
    }


    function updateBuildInfo(buildTypeId) {
        /*
        Requests buildType info and updates corresponding DOM element.
        */

        $.ajax({
            type: 'GET',
            sync: false,
            url: generateBuildTypeUrl(buildTypeId),
            success: onGetBuildInfoSuccess,
            error: onGetBuildInfoError
        });

        function onGetBuildInfoSuccess(data) {
            var el = $('#' + data.buildType.id);

            el.removeClass(classBuildFailed, classBuildSuccess);
            if (data.status == 'SUCCESS') {
                el.addClass(classBuildSuccess);
            } else {
                el.addClass(classBuildFailed);
            }

            el.find(selectorBuildTitle).html(data.buildType.name);
            if (data.triggered.user) {
                el.find(selectorBuildTriggeredBy).html(data.triggered.user.name);
            } else {
                el.find(selectorBuildTriggeredBy).html(data.triggered.details);
            }

            el.find(selectorBuildStatusText).html(data.statusText);
        }

        function onGetBuildInfoError(xhr, type) {}
    }

    $(document).ready(function() {
        layoutBuilds();
    });

})(Zepto, _, window);