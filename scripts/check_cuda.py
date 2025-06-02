import torch
import sys

print("=== CUDA Detection Report ===")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"Device count: {torch.cuda.device_count()}")
    for i in range(torch.cuda.device_count()):
        print(f"Device {i}: {torch.cuda.get_device_name(i)}")
        print(f"  Memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.1f} GB")
else:
    print("CUDA not available - possible reasons:")
    print("1. No CUDA-capable GPU")
    print("2. CUDA drivers not installed")
    print("3. PyTorch CPU-only version installed")
    print("4. CUDA version mismatch")

# Check if this is a CPU-only PyTorch installation
try:
    if hasattr(torch.version, 'cuda') and torch.version.cuda is None:
        print("\nWARNING: This appears to be a CPU-only PyTorch installation")
        print("To enable GPU support, you may need to reinstall PyTorch with CUDA support")
except:
    pass

print("\n=== End Report ===")