BUILDS_LAYOUT = [
    [{'id': 'Wgnps_Pep8psa'}, {'id': 'bt362'}, {'id': 'Wgnps_UnittestStablePsa'}, {'id': 'bt409'},  {'id': 'StagingBuilds_Psa_PsaSnd'}],
    [{'id': 'Wgnps_Pep8pso'}, {'id': 'bt360'}, {'id': 'Wgnps_UnittestStablePso'}, {'id': 'Wgnps_DeployStableStage11012824'}, {'id': 'StagingBuilds_Pso_PsoSnd'}],
    [{'id': 'Wgnps_Pep8pss'}, {'id': 'bt363'}, {'id': 'Wgnps_UnittestStablePss'}, {'id': 'Wgnps_DeployTrunkStage10128218'}, {'id': 'StagingBuilds_Pss_PssxSnd'}],
    [{'id': 'Wgnps_Pep8psui'}, {'id': 'Wgnps_UnittestTrunkPsui'}, {'id': 'Wgnps_UnittestStablePsui'}, {'id': ''}, {'id': 'StagingBuilds_Psui_PsuiSnd'}],
    [{'id': 'Wgnps_Pep8psfc'}, {'id': 'Wgnps_UnittestPsfc'}],
]

COVERAGE_BUILDS = ['bt362', 'bt360', 'bt363', 'Wgnps_UnittestTrunkPsui',
                   'Wgnps_UnittestPsfc', 'Wgnps_UnittestStablePso',
                   'Wgnps_UnittestStablePss', 'Wgnps_UnittestStablePsui']
