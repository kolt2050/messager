FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies if package.json exists, otherwise just echo
RUN if [ -f package.json ]; then npm install; else echo "No package.json yet"; fi

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]
