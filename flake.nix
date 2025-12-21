{
  description = "Shield AI - AI-powered DNS protection system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" "clippy" "rustfmt" ];
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust toolchain
            rustToolchain
            pkg-config
            openssl

            # Node.js for frontend
            nodejs_20
            nodePackages.npm

            # Development tools
            just
            cargo-watch
            cargo-audit
            cargo-deny

            # Testing
            curl
            jq
            websocat

            # Docker
            docker
            docker-compose

            # Git
            git
            gh
          ];

          shellHook = ''
            echo "🛡️  Shield AI Development Environment"
            echo "===================================="
            echo "Rust: $(rustc --version)"
            echo "Node: $(node --version)"
            echo "NPM: $(npm --version)"
            echo ""
            echo "Commands:"
            echo "  cargo build --release  - Build backend"
            echo "  cd frontend && npm run dev  - Start frontend"
            echo "  just test  - Run all tests"
            echo ""
            export RUST_BACKTRACE=1
            export RUST_LOG=info
          '';

          RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";
        };

        # Packages
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "shield-ai";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;

          nativeBuildInputs = with pkgs; [ pkg-config ];
          buildInputs = with pkgs; [ openssl ];
        };

        # Docker image
        packages.docker = pkgs.dockerTools.buildImage {
          name = "shield-ai";
          tag = "latest";
          contents = [ self.packages.${system}.default ];
          config = {
            Cmd = [ "/bin/api-server" ];
            ExposedPorts = { "8080/tcp" = {}; };
          };
        };
      }
    );
}
