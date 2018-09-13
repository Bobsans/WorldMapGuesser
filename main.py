from argparse import ArgumentParser

from bottle import run

from app import create_tables, db, config

parser = ArgumentParser()
parser.add_argument('-p', '--port', type=int, action='store', dest='port', default=8000, help='Port')
parser.add_argument('-d', '--debug', action='store_true', dest='debug', default=False, help='Debug')
args = parser.parse_args()

config.DEBUG = args.debug

create_tables()

try:
    run(port=args.port)
except KeyboardInterrupt:
    print('kill by ctrl+c')
    db.close()
