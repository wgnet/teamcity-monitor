#!/usr/bin/python
# -*- coding: utf-8 -*-

from zope.interface import implements

from twisted.python import usage
from twisted.plugin import IPlugin
from twisted.application.service import IServiceMaker
from twisted.application import internet

from server import make_factory


class Options(usage.Options):

    optParameters = [
        ['port', 'p', 8000, 'The port number to listen on.'],
    ]


class ServiceMaker(object):
    implements(IServiceMaker, IPlugin)
    tapname = 'teamcity-monitor'
    description = 'Teamcity minitor service'
    options = Options

    def makeService(self, options):
        """ Construct a TCPServer from a factory. """

        factory = make_factory()
        return internet.TCPServer(int(options['port']), factory)


serviceMaker = ServiceMaker()
