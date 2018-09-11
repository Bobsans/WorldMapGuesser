from argparse import ArgumentParser

from bottle import run

from app import create_tables, db

parser = ArgumentParser()
parser.add_argument('-p', '--port', type=int, action='store', dest='port', default=8000, help='Port')
args = parser.parse_args()

create_tables()

try:
    run(port=args.port)
except KeyboardInterrupt:
    print('kill by ctrl+c')
    db.close()
