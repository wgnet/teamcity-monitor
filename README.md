teamcity-monitor
================

Solution for monitoring realtime status of TeamCity builds on TV or big monitor.
Used in continuous integration team for quickly respond to any build fail.
Consists of server (Python, Twisted) and client (JavaScript) parts.
Server side works as a proxy between client side and TeamCity REST API.
Adapted for 32" LG TV (4 builds per row, 5 rows per screen).


Server side
===========
- Setup virual environment for teamcity-monitor using 'virtualenv' tool - 'virtualenv --no-site-packages venv'.
- Install 'twisted' python package using 'pip' tool - 'pip install twisted'.
- Set you TeamCity url, login and password in settings.env file and run 'source settings.env' to setup environment variables.
- Configure your builds by adding necessary build configuration id to config.py file.
- Run 'python server.py --port=8000' or 'twistd teamcity-monitor' to startup server.



Client side
===========
- Open http://127.0.0.1:8000 url in web browser to see your builds status.

