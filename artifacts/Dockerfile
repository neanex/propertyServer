#
# ---- Base Node ----
FROM node:10 AS base
# set working directory
WORKDIR /nodejs
# copy project file
COPY package.json .

#
# ---- Dependencies ----
FROM base AS dependencies
# install node packages
RUN npm set progress=false && npm config set depth 0
RUN npm install
# copy production node_modules aside
RUN cp -R node_modules prod_node_modules

#
# ---- Release ----
FROM base AS release
# copy production node_modules
COPY --from=dependencies /nodejs/prod_node_modules ./node_modules
# copy app sources
COPY . .
# Start the project
CMD PORT=8000 npm start