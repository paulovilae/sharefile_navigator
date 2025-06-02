#!/usr/bin/env python3
"""
Script to help upgrade PyTorch to GPU-enabled version.
"""
import subprocess
import sys
import torch

def check_current_pytorch():
    """Check current PyTorch installation."""
    print("=== Current PyTorch Status ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if hasattr(torch.version, 'cuda') and torch.version.cuda is None:
        print("Current installation: CPU-only")
        return False
    elif torch.cuda.is_available():
        print("Current installation: GPU-enabled")
        return True
    else:
        print("Current installation: Unknown GPU status")
        return False

def get_cuda_version():
    """Try to detect CUDA version on system."""
    try:
        result = subprocess.run(['nvcc', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            output = result.stdout
            for line in output.split('\n'):
                if 'release' in line.lower():
                    # Extract CUDA version
                    import re
                    match = re.search(r'release (\d+\.\d+)', line)
                    if match:
                        return match.group(1)
        return None
    except FileNotFoundError:
        return None

def suggest_pytorch_installation():
    """Suggest PyTorch installation command."""
    print("\n=== PyTorch GPU Installation Suggestions ===")
    
    cuda_version = get_cuda_version()
    if cuda_version:
        print(f"Detected CUDA version: {cuda_version}")
        
        # Map CUDA versions to PyTorch installation commands
        cuda_commands = {
            "12.1": "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
            "12.4": "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124",
            "11.8": "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118",
        }
        
        if cuda_version in cuda_commands:
            print(f"\nRecommended installation command:")
            print(f"  {cuda_commands[cuda_version]}")
        else:
            print(f"\nFor CUDA {cuda_version}, check PyTorch website for compatible version:")
            print("  https://pytorch.org/get-started/locally/")
    else:
        print("CUDA not detected or nvcc not in PATH")
        print("\nOptions:")
        print("1. Install CUDA drivers from NVIDIA")
        print("2. Use CPU-only PyTorch (current setup)")
        print("3. Check PyTorch website: https://pytorch.org/get-started/locally/")
    
    print("\nGeneral GPU installation command (latest CUDA):")
    print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
    
    print("\nTo upgrade in your virtual environment:")
    print("1. Activate your virtual environment:")
    print("   .venv-gpu\\Scripts\\activate")
    print("2. Uninstall current PyTorch:")
    print("   pip uninstall torch torchvision torchaudio")
    print("3. Install GPU version:")
    print("   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")

def main():
    """Main function."""
    is_gpu_enabled = check_current_pytorch()
    
    if is_gpu_enabled:
        print("\n✅ PyTorch GPU support is already enabled!")
        print("Your OCR application should be able to use GPU acceleration.")
    else:
        print("\n❌ PyTorch is CPU-only")
        print("Your OCR application will use CPU processing (slower but functional).")
        suggest_pytorch_installation()
    
    print("\n=== Note ===")
    print("After upgrading PyTorch, restart your OCR application to use GPU acceleration.")
    print("The application will automatically detect and use GPU when available.")

if __name__ == "__main__":
    main()