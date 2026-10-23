#!/usr/bin/env bash

# Config
REPOSITORY="https://github.com/Bobsans/WorldMapGuesser.git"
TMPDIR="/tmp/world-guesser-game"
DESTDIR="/home/darkboy/games/world-map-guesser"
SUPERVISORTASK=world-map-guesser
FILESTOCOPY=(
    server/app
    server/templates
    server/main.py
)
NODELETE=(
    db.sqlite
    logs
)
GRANTACCESS=(
    logs
)

# System variables
MEPATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/$(basename -- "${BASH_SOURCE[0]}")"
BL=`tput setaf 4`
YL=`tput setaf 3`
GR=`tput setaf 2`
RD=`tput setaf 1`
NC=`tput sgr0`

function joinby { local IFS="$1"; shift; echo "$*"; }

check_ret_val () {
    if [ $? -eq 0 ]; then
        echo -e "${GR}SUCCESS!${NC}"
    else
        echo -e "${RD}ERROR!${NC}"
        if [ ! -z "$1" ]; then
            echo -e "$1"
        fi
        exit
    fi
}


echo -e "${YL}AUTOUPGRADER-3000 STARTED!${NC}"

echo "${BL}-------------------------------------------------${NC}"

echo -e "${YL}###  PREPARING TEMPORARY DIRECTORY  ###${NC}"
[[ -d "${TMPDIR}" ]] || mkdir ${TMPDIR}
check_ret_val "Unable to create direcory ${TMPDIR}"
cd ${TMPDIR}

echo -e "${YL}###  PULLING GIT REPOSITORY  ###${NC}"
[[ -d "${TMPDIR}/.git" ]] || {
    git init
    git remote add origin ${REPOSITORY}
}
git remote set-url origin "${REPOSITORY}"
git pull origin main
check_ret_val

[[ -f "${TMPDIR}/server/upgrade.sh" ]] && [[ "${MEPATH}" -ot "${TMPDIR}/server/upgrade.sh" ]] && {
    echo -e "${YL}###  UPDATE SELF  ###${NC}"
    echo -e "${YL}RESTARTING...${NC}"
    cp -rf "${TMPDIR}/server/upgrade.sh" "${MEPATH}" && chmod +x "${MEPATH}" && exec "${MEPATH}" "$@"
    exit 1
}

echo -e "${YL}###  UPDATING PACKAGE DEPENDENCIES  ###${NC}"
npm --prefix "${TMPDIR}/web" ci
check_ret_val

echo -e "${YL}###  BUILDING STATICS  ###${NC}"
npm --prefix "${TMPDIR}/web" run build
check_ret_val

echo -e "${YL}###  STOPPING SUPERVISOR  ###${NC}"
supervisorctl stop ${SUPERVISORTASK}
check_ret_val

echo -e "${YL}###  GO TO DESTDIR AND CLEAR IT  ###${NC}"
GLOBIGNORE=$(joinby ':' ${NODELETE[@]})
cd ${DESTDIR} && rm -R *
check_ret_val

echo -e "${YL}###  CREATING VENV  ###${NC}"
virtualenv env && source env/bin/activate
check_ret_val
[[ -f "${TMPDIR}/server/requirements.txt" ]] && {
    pip install -r "${TMPDIR}/server/requirements.txt"
    check_ret_val
}

echo -e "${YL}###  COPYING FILES  ###${NC}"
for file in "${FILESTOCOPY[@]}";
    do cp -rf "${TMPDIR}/$file" "${DESTDIR}";
done
check_ret_val

cp -rf "${TMPDIR}/web/dist" "${DESTDIR}/static"
check_ret_val
mkdir -p "${DESTDIR}/logs"
check_ret_val

echo -e "${YL}###  GRANTING ACCESS  ###${NC}"
for file in "${GRANTACCESS[@]}";
    do chmod 777 "${DESTDIR}/$file";
done
check_ret_val


echo -e "${YL}###  STARTING SUPERVISOR  ###${NC}"
supervisorctl start ${SUPERVISORTASK}
check_ret_val

echo -e "${BL}-------------------------------------------------${NC}"

echo -e "${YL}AUTOUPGRADER-3000 DID HIS JOB!${NC}"
