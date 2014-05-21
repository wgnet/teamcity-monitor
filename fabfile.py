# -*- coding: utf-8 -*-

import os
from contextlib import nested

from fabric.api import cd, run, settings, local, put
from fabric.context_managers import prefix, hide

__all__ = (
    'deploy',
)


SOURCES_DIR = os.path.join('~', 'teamcity-monitor')
VENV_DIR = os.path.join(SOURCES_DIR, 'venv')


def deploy(port=8000):
    stop()
    purge_sources()
    upload_sources()
    setup_virtual_environment()
    install_python_packages()
    start(port)


def start(port):
    print 'Start teamcity-monitor...'

    python_path = os.path.join(VENV_DIR, 'bin', 'python')

    with nested(cd(SOURCES_DIR), prefix('. settings.env')):
        run('dtach -n `mktemp -u /tmp/teamcity-monitor.XXX` %s server.py --port=%s' % \
            (python_path, port))


def stop():
    print 'Stop teamcity-monitor...'

    with nested(settings(warn_only=True), hide('everything')):
        run("kill -9 `ps -ef | grep 'server.py' | grep -v grep | awk '{print $2}'`")


def purge_sources():
    print 'Delete old sources...'

    with hide('commands'):
        run('rm -rf %s' % os.path.join(SOURCES_DIR, '*'))


def upload_sources():
    print 'Upload sources to remote host...'

    tarball = 'sources.tar'

    with nested(hide('commands'), settings(warn_only=True)):
        local('rm -rf %s' % tarball)
        local('tar --exclude="*.pyc" -cf %s .' % tarball)

        run('mkdir -p %s' % SOURCES_DIR)
        put(tarball, SOURCES_DIR)

        with cd(SOURCES_DIR):
            with settings(warn_only=True):
                run('tar -xf %s' % tarball)

        run('rm %s' % os.path.join(SOURCES_DIR, tarball))

    local('rm -rf ./%s' % tarball)


def setup_virtual_environment():
    print 'Setup virtual environment...'

    with nested(hide('commands'), cd(SOURCES_DIR)):
        run('virtualenv --no-site-packages --python=python2.6 venv')


def install_python_packages():
    print 'Install python packages...'

    pip_path = os.path.join(VENV_DIR, 'bin', 'pip')
    packages_path = os.path.join(SOURCES_DIR, '.meta', 'packages')

    with hide('commands'):
        run('%s install -r %s' % (pip_path, packages_path))
