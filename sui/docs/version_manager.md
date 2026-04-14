Yes! There are several ways to manage different Sui versions:

  1. sui-up (Official Sui Version Manager)

  This is similar to rustup for Rust:

  # Install sui-up
  cargo install --git https://github.com/MystenLabs/sui sui-up

  # Install specific Sui version
  sui-up install 1.55.0
  sui-up install 1.62.0

  # Switch between versions
  sui-up use 1.55.0
  sui-up use 1.62.0

  # Check current version
  sui --version

  2. asdf (Multi-language Version Manager)

  If you use asdf for other tools:

  # Add Sui plugin
  asdf plugin add sui https://github.com/asdf-community/asdf-sui

  # Install specific version
  asdf install sui 1.55.0

  # Set local version for this project
  cd /path/to/turbos-clmm-public
  asdf local sui 1.55.0

  # This creates a .tool-versions file

  3. Manual Binary Management

  Keep multiple Sui binaries:

  # Download specific versions to separate directories
  ~/sui-versions/1.55.0/sui
  ~/sui-versions/1.62.0/sui

  # Use symlinks or PATH manipulation
  export PATH="$HOME/sui-versions/1.55.0:$PATH"

  4. Docker (Most Reliable for CI/CD)

  FROM mysten/sui:1.55.0

  WORKDIR /app
  COPY . .
  RUN sui move test

  For your situation, I recommend checking if you already have sui-up or can install specific Sui versions. Would you like me to help you:
  1. Install sui 1.55.0 using one of these methods?
  2. Or just revert Move.lock and let you handle version management?