import sqlite3

from app import config


class QueryResult:
    def __init__(self, connection, cursor=None):
        self.connection = connection
        self.cursor = cursor or connection.cursor()

    def commit(self):
        self.connection.commit()

    def fetch(self, all=False, asdict=False):
        if all:
            data = self.cursor.fetchall()
            return [dict(zip(row.keys(), row)) for row in data] if asdict else data
        data = self.cursor.fetchone()
        return dict(zip(data.keys(), data)) if asdict else data


class DBMeta(type):
    _instance = None

    def __call__(self, *args, **kwargs):
        if self._instance is None:
            self._instance = super().__call__(*args, **kwargs)
        return self._instance


class DB(metaclass=DBMeta):
    def __init__(self, file):
        self.connection = sqlite3.connect(file)
        self.connection.row_factory = sqlite3.Row

    def query(self, query, *args, **kwargs):
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, *args)
            return QueryResult(self.connection, cursor)
        except Exception as e:
            print(e)
            return QueryResult(self.connection)

    def close(self):
        self.connection.close()

    def __del__(self):
        self.close()


db = DB(config.DB_FILE)


def create_tables():
    db.query('CREATE TABLE IF NOT EXISTS results (user TEXT, result INT, time INT, rights TEXT, wrongs TEXT)').commit()
