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


class BaseResource(Resource):
    isLeaf = True
    REQUEST_URL = None

    def download_page(self, url):
        basic_auth = base64.encodestring('%s:%s' % (TEAMCITY_LOGIN,
                                                    TEAMCITY_PASSWORD))
        basic_auth = basic_auth.strip()
        request_headers = {
            'Accept': 'application/json',
            'Authorization': 'Basic %s' % basic_auth,
        }

        return getPage(url=url, headers=request_headers)

    def generate_request_url(self, request):
        build_type_id = request.args.get('buildTypeId')[0]
        request._request_url = self.REQUEST_URL % (TEAMCITY_REST_API_URL,
                                                   build_type_id)

        return request

    @defer.inlineCallbacks
    def process(self, request):
        request._response = yield self.download_page(request._request_url)

        defer.returnValue(request)

    def reply(self, request):
        request.setResponseCode(200)
        request.setHeader('Content-Type', 'application/json')
        request.write(request._response)
        request.finish()

        return request

    def render_GET(self, request):
        deferred = defer.Deferred()
        deferred.addCallback(self.generate_request_url)
        deferred.addCallback(self.process)
        deferred.addCallback(self.reply)
        deferred.callback(request)

        return server.NOT_DONE_YET


class BuildTypeResource(BaseResource):
    REQUEST_URL = '%s/buildTypes/id:%s/builds/count:1'


class BuildChangesResource(BaseResource):
    REQUEST_URL = '%s/changes/buildType:(id:%s)'


class RunningBuildsResource(BaseResource):
    REQUEST_URL = '%s/buildTypes/id:%s/builds/?locator=running:true'


class ConfigResource(BaseResource):
    def prepare_config(self, request):
        request._response = json.dumps({'buildsLayout': config.BUILDS_LAYOUT})

        return request

    def render_GET(self, request):
        deferred = defer.Deferred()
        deferred.addCallback(self.prepare_config)
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
    root.putChild('static', File('static'))
    root.putChild('config', ConfigResource())

    factory = Site(root)

    return factory


def main(args):
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
