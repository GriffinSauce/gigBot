#!/bin/bash
# This deploy hook gets executed after dependencies are resolved and the
# build hook has been run but before the application has been started back
# up again.  This script gets executed directly, so it could be python, php,
# ruby, etc.

echo Copying secrets from data dir...
cp ${OPENSHIFT_DATA_DIR}/secrets.json ${OPENSHIFT_REPO_DIR}
