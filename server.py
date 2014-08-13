#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import sys
import json
import base64
from optparse import OptionParser

from twisted.internet import defer
from twisted.internet import reactor

from twisted.web import server
from twisted.web.server import Site
from twisted.web.static import File
from twisted.web.client import getPage
from twisted.web.resource import Resource

import config


TEAMCITY_LOGIN = os.environ['TEAMCITY_LOGIN']
TEAMCITY_PASSWORD = os.environ['TEAMCITY_PASSWORD']
TEAMCITY_URL = os.environ['TEAMCITY_URL']
TEAMCITY_REST_API_URL = '%s/httpAuth/app/rest' % TEAMCITY_URL


def download_page(url):
    basic_auth = base64.encodestring('%s:%s' % (TEAMCITY_LOGIN,
                                                TEAMCITY_PASSWORD))
    basic_auth = basic_auth.strip()
    request_headers = {
        'Accept': 'application/json',
        'Authorization': 'Basic %s' % basic_auth,
    }

    return getPage(url=url, headers=request_headers)


class BaseResource(Resource):
    isLeaf = True
    REQUEST_URL = None

    def generate_request_url(self, build_type_id):
        return self.REQUEST_URL % (TEAMCITY_REST_API_URL, build_type_id)

    def process_response(self, response, build_type_id):
        try:
            response = json.loads(response)
        except:
            response = {}
        finally:
            response['buildTypeId'] = build_type_id
            return response

    def generate_response_data(self, response):
        response_data = {}
        for success, data in response:
            if success:
                response_data[data['buildTypeId']] = data

        return json.dumps(response_data)

    def get_all_build_types_id(self):
        for row in config.BUILDS_LAYOUT:
            for build_type in row:
                yield build_type

    def reply(self, response, request):
        request.setResponseCode(200)
        request.setHeader('Content-Type', 'application/json')
        request.write(self.generate_response_data(response))

        if not request.finished:
            request.finish()

        return request

    def render_GET(self, request):
        deferreds = []
        for build_type_id in self.get_all_build_types_id():
            deferred = download_page(self.generate_request_url(build_type_id))
            deferred.addCallback(self.process_response, build_type_id)
            deferreds.append(deferred)

        deferred_list = defer.DeferredList(deferreds)
        deferred_list.addCallback(self.reply, request)

        return server.NOT_DONE_YET


class BuildTypeResource(BaseResource):
    REQUEST_URL = '%s/buildTypes/id:%s/builds/count:1'


class BuildChangesResource(BaseResource):
    REQUEST_URL = '%s/changes/buildType:(id:%s)'


class RunningBuildsResource(BaseResource):
    REQUEST_URL = '%s/buildTypes/id:%s/builds/?locator=running:true'


class BuildStatisticsResource(BaseResource):
    REQUEST_URL = '%s/builds/buildType:%s/statistics/'

    def get_all_build_types_id(self):
        return config.COVERAGE_BUILDS


class ConfigResource(BaseResource):
    def generate_response_data(self):
        return json.dumps({
            'buildsLayout': config.BUILDS_LAYOUT,
            'coverageBuilds': config.COVERAGE_BUILDS
        })

    def reply(self, request):
        request.setResponseCode(200)
        request.setHeader('Content-Type', 'application/json')
        request.write(self.generate_response_data())

        if not request.finished:
            request.finish()

        return request

    def render_GET(self, request):
        deferred = defer.Deferred()
        deferred.addCallback(self.reply)
        deferred.callback(request)

        return server.NOT_DONE_YET


class MonitorResource(Resource):
    isLeaf = False

    def render_GET(self, request):
        return open('index.html').read()

    def getChild(self, name, request):
        if name == '':
            return self

        return Resource.getChild(self, name, request)


def make_factory():
    root = MonitorResource()
    root.putChild('build_type', BuildTypeResource())
    root.putChild('build_changes', BuildChangesResource())
    root.putChild('running_builds', RunningBuildsResource())
    root.putChild('build_statistics', BuildStatisticsResource())
    root.putChild('static', File('static'))
    root.putChild('config', ConfigResource())

    factory = Site(root)

    return factory


def main(args):
    if not all((TEAMCITY_LOGIN, TEAMCITY_PASSWORD, TEAMCITY_URL)):
        sys.exit(u'TeamCity credentials or url not set!')

    parser = OptionParser(usage='%prog ARGUMENTS')
    parser.add_option('-p', '--port',
                      action='store',
                      help='TCP port to listen to')
    options, args = parser.parse_args()
    if not options.port:
        parser.error('Specify TCP port to listen to')

    factory = make_factory()
    reactor.listenTCP(int(options.port), factory)
    reactor.run()


if __name__ == '__main__':
    sys.exit(main(sys.argv))
