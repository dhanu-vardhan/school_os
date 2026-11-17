$Root = Split-Path -Parent $PSScriptRoot
python "$Root\verify\runner.py" @args
