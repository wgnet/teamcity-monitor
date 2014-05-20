(function($, global) {
    var selectorBuildTitle = '.build-title',
        selectorBuildTriggeredBy = '.build-triggered-by',
        selectorBuildStatusText = '.build-status-text',

        classBuildSuccess = 'build-success',
        classBuildFailed = 'build-failed';


    function generateBuildTypeUrl(buildTypeId) {
        return '/build_type/?buildTypeId=' + buildTypeId;
    }


    function updateBuildTypeInfo(data) {
        var el = $('#' + data.buildType.id);

        el.removeClass(classBuildFailed, classBuildSuccess);
        if (data.status == 'SUCCESS') {
            el.addClass(classBuildSuccess);
        } else {
            el.addClass(classBuildFailed);
        }

        el.find(selectorBuildTitle).html(data.buildType.name);
        el.find(selectorBuildTriggeredBy).html(data.triggered.user.name);
        el.find(selectorBuildStatusText).html(data.statusText);
    }


    function getBuildInfo(buildTypeId) {
        $.ajax({
            type: 'GET',
            url: generateBuildTypeUrl(buildTypeId),
            success: updateBuildTypeInfo,
            error: function(xhr, type) {console.log('error')}
        });
    }

    $(document).ready(function() {
        getBuildInfo('Wgnps_UnittestTrunkPsui');
    });

})(Zepto, window);