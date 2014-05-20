#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import json
import base64

from twisted.python import log
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
TEAMCITY_URL = 'http://teamcity.wargaming.net'


def download_page(url):
    basic_auth = base64.encodestring('%s:%s' % \
                                     (TEAMCITY_LOGIN, TEAMCITY_PASSWORD))
    basic_auth = basic_auth.strip()
    request_headers = {
        'Accept': 'application/json',
        'Authorization': 'Basic %s' % basic_auth,
    }

    return getPage(url=url, headers=request_headers)


@defer.inlineCallbacks
def get_build_type_info(request):
    build_type_url = '%s/httpAuth/app/rest/buildTypes/id:%s/builds/count:1' % \
        (TEAMCITY_URL, request.args.get('buildTypeId')[0])
    log.msg('buildTypeUrl: %s' % build_type_url)
    response = yield download_page(build_type_url)
    request._response = response

    defer.returnValue(request)


@defer.inlineCallbacks
def get_running_builds_info(request):
    running_builds_url = '%s/httpAuth/app/rest/buildTypes/id:%s/builds/?locator=running:true' % \
        (TEAMCITY_URL, request.args.get('buildTypeId')[0])
    response = yield download_page(running_builds_url)
    request._response = response

    defer.returnValue(request)


def prepare_config(request):
    request._response = json.dumps({'buildMatrix': config.BUILD_MATRIX})

    return request


def reply(request):
    request.setResponseCode(200)
    request.setHeader('Content-Type', 'application/json')
    request.write(request._response)
    request.finish()

    return request


class BuildTypeReource(Resource):
    isLeaf = True

    def render_GET(self, request):
        deferred = defer.Deferred()
        deferred.addCallback(get_build_type_info)
        deferred.addCallback(reply)
        deferred.callback(request)

        return server.NOT_DONE_YET


class RunningBuildsResource(Resource):
    isLeaf = True

    def render_GET(self, request):
        deferred = defer.Deferred()
        deferred.addCallback(get_running_builds_info)
        deferred.addCallback(reply)
        deferred.callback(request)

        return server.NOT_DONE_YET


class ConfigResource(Resource):
    isLeaf = True

    def render_GET(self, request):
        deferred = defer.Deferred()
        deferred.addCallback(prepare_config)
        deferred.addCallback(reply)
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


root = MonitorResource()
root.putChild('build_type', BuildTypeReource())
root.putChild('running_builds', RunningBuildsResource())
root.putChild('static', File('static'))
root.putChild('config', ConfigResource())

factory = Site(root)
reactor.listenTCP(8000, factory)
reactor.run()
