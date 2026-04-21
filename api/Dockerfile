# Use Bun runtime
FROM oven/bun:latest

# Set the working directory
WORKDIR /butterstack-be

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-setuptools \
    python3-venv \
    python3-dev \
    make \
    g++ \
    libsqlite3-dev \
 && apt-get clean

# Copy package files
COPY package*.json bun.lock* ./

# Install dependencies with Bun
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["bun", "start"]
