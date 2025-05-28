import subprocess
import sys

TOP_N = 20

def get_git_blob_sizes():
    # Get all object hashes and paths
    rev_list = subprocess.run([
        'git', 'rev-list', '--objects', '--all'
    ], capture_output=True, text=True, check=True)
    hash_to_path = {}
    for line in rev_list.stdout.splitlines():
        parts = line.strip().split(' ', 1)
        if len(parts) == 2:
            hash_to_path[parts[0]] = parts[1]

    # Get all blob sizes
    cat_file = subprocess.run([
        'git', 'cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize)'
    ], input='\n'.join(hash_to_path.keys()), capture_output=True, text=True, check=True)
    entries = []
    for line in cat_file.stdout.splitlines():
        parts = line.strip().split()
        if len(parts) == 3 and parts[0] == 'blob':
            size = int(parts[2])
            obj_hash = parts[1]
            path = hash_to_path.get(obj_hash, '(unknown)')
            entries.append((size, path))
    return entries

try:
    entries = get_git_blob_sizes()
except Exception as e:
    print(f"Error running git commands: {e}")
    sys.exit(1)

entries.sort(key=lambda x: x[0], reverse=True)

print(f"Top {TOP_N} largest files in git history:")
for i, (size, name) in enumerate(entries[:TOP_N], 1):
    print(f"{i:2d}. {size:10d} bytes  {name}") 