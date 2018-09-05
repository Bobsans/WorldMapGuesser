#!/usr/bin/env bash

REPOSITORY=https://Bobsans:poiKLJ951@bitbucket.org/Bobsans/world-map-guesser-game.git
TMPDIR=/tmp/world-guesser-game
DESTDIR=/home/darkboy/games/world-map-guesser
SUPERVISORTASK=world-map-guesser
FILESTOCOPY=(
    static
    templates
    app.py
)

BL=`tput setaf 4`
YL=`tput setaf 3`
GR=`tput setaf 2`
RD=`tput setaf 1`
NC=`tput sgr0`

DONE=0
ERRORS=0

check_ret_val () {
    if [ $? -eq 0 ]; then
        DONE=$(expr ${DONE} + 1)
        echo -e "${GR}SUCCESS!${NC}"
    else
        ERRORS=$(expr ${ERRORS} + 1)
        echo -e "${RD}ERROR!${NC}"
        if [ ! -z "$1" ]; then
            echo -e "$1"
            exit
        fi
    fi
}


echo -e "${YL}AUTOUPGRADER-3000 STARTED!${NC}"

echo "${BL}-------------------------------------------------${NC}"

echo -e "${YL}###  PREPARING TEMPORARY DIRECTORY  ###${NC}"
if [ ! -d "${TMPDIR}" ]; then
    mkdir ${TMPDIR}
fi
check_ret_val "Unable to create direcory ${TMPDIR}"
cd ${TMPDIR}

echo -e "${YL}###  PULLING GIT REPOSITORY  ###${NC}"
if [ ! -d "${TMPDIR}/.git" ]; then
    git init
    git remote add origin ${REPOSITORY}
fi
git pull origin master
check_ret_val

echo -e "${YL}###  BUILDING STATICS  ###${NC}"
npm i
check_ret_val
npm run build
check_ret_val

echo -e "${YL}###  STOPPING SUPERVISOR  ###${NC}"
supervisorctl stop ${SUPERVISORTASK}
check_ret_val

echo -e "${YL}###  GO TO DESTDIR AND CLEAR IT  ###${NC}"
cd ${DESTDIR} && rm -r ./*
check_ret_val

echo -e "${YL}###  CREATING AND ACTIVATING VENV  ###${NC}"
virtualenv env && source env/bin/activate
check_ret_val
pip install -r ${TMPDIR}/requirements.txt
check_ret_val

echo -e "${YL}###  COPY FILES  ###${NC}"
for file in "${FILESTOCOPY[@]}";
    do cp -rf "${TMPDIR}/$file" "${DESTDIR}/$file";
done
check_ret_val

echo -e "${YL}###  STARTING SUPERVISOR  ###${NC}"
supervisorctl start ${SUPERVISORTASK}
check_ret_val

echo -e "${YL}###  STARTING SUPERVISOR  ###${NC}"
supervisorctl start ${SUPERVISORTASK}
check_ret_val

echo -e "${BL}-------------------------------------------------${NC}"

echo -e "${GR}DONE:   ${DONE}${NC}"
echo -e "${RD}ERRORS: ${ERRORS}${NC}"

echo -e "${BL}-------------------------------------------------${NC}"

echo -e "${YL}AUTOUPGRADER-3000 DID HIS JOB!${NC}"
