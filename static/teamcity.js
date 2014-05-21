(function($, _, global) {
    var selectorBuildTitle = '.build-title',
        selectorBuildStatusText = '.build-status-text',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildRevision = '.build-revision',
        selectorBuildTemplate = '#build-template',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed';


    function ajax(url, sync, successCallback, errorCallback) {
        $.ajax({
            type: 'GET',
            sync: sync,
            url: url,
            error: errorCallback,
            success: successCallback
        });
    }


    function layoutBuilds() {
        /*
        Generates DOM elements for each build and updates builds info.
        */

        ajax('/config/', true, onGetConfigSuccess, onGetConfigError);

        function onGetConfigSuccess(data) {
            var body = $('body'),
                buildTemplate = _.template($(selectorBuildTemplate).html());

            _.each(data.buildsLayout, function(row) {
                _.each(row, function(build) {
                    body.append(buildTemplate(build));
                    updateBuildGenericInfo(build.id);
                    updateBuildChangesInfo(build.id);
                });
                body.append($('<br/>'));
            });
        }

        function onGetConfigError(xhr, type) {
            $('body').html('Error: unable to initialize builds')
        }
    }


    function updateBuildChangesInfo(buildTypeId) {
        /*
        Requests build changes info and updates corresponding DOM element with
        changes info.
        */

        ajax('/build_changes/?buildTypeId=' + buildTypeId, false,
             onGetBuildChangesSuccess, onGetBuildChangesError);

        function onGetBuildChangesSuccess(data) {
            var el = $('#' + buildTypeId),
                commiter = data.user ? data.user.name : data.username;

            el.find(selectorBuildTriggeredBy).html(commiter);
            el.find(selectorBuildRevision).html(data.version);
        }

        function onGetBuildChangesError(xhr, type) {}
    }


    function updateBuildGenericInfo(buildTypeId) {
        /*
        Requests buildType info and updates corresponding DOM element with
        build name, status, statusText.
        */

        ajax('/build_type/?buildTypeId=' + buildTypeId, false,
             onGetBuildInfoSuccess, onGetBuildInfoError);

        function onGetBuildInfoSuccess(data) {
            var el = $('#' + buildTypeId);

            el.removeClass(classBuildFailed, classBuildSuccess);
            if (data.status == 'SUCCESS') {
                el.addClass(classBuildSuccess);
            } else {
                el.addClass(classBuildFailed);
            }

            el.find(selectorBuildTitle).html(data.buildType.name);
            el.find(selectorBuildStatusText).html(data.statusText);
        }

        function onGetBuildInfoError(xhr, type) {}
    }


    $(document).ready(function() {
        layoutBuilds();
    });

})(Zepto, _, window);