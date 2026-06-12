import sys
from pathlib import Path

try:
    from PyPDF2 import PdfReader
except ImportError:
    print('MISSING_PYPDF2')
    sys.exit(2)

pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('Frontend/Abhishek_Desai_Resume.pdf')
if not pdf_path.exists():
    print('MISSING_PDF')
    sys.exit(3)

reader = PdfReader(str(pdf_path))
text_parts = []
for p in reader.pages:
    try:
        text_parts.append(p.extract_text() or '')
    except Exception as e:
        text_parts.append('')

text = '\n\n'.join(text_parts)
base = Path(__file__).resolve().parent
out = base / 'resume_extracted.txt'
out.write_text(text, encoding='utf-8')
print('EXTRACTED', out)
