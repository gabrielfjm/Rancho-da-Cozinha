# Atualização do acervo internacional

O app usa um retrato local do TheMealDB. As 9 fichas brasileiras curadas ficam em
`src/data/brazilianRecipes.ts`; o restante vem da API pública do TheMealDB.

Para atualizar a base e gerar o conteúdo em português brasileiro:

```powershell
py -3.11 -m venv .venv-translate
.venv-translate\Scripts\python.exe -m pip install -r scripts\requirements-translate.txt
python scripts\import_themealdb.py
.venv-translate\Scripts\python.exe scripts\translate_themealdb.py
npm run build
```

O tradutor instala automaticamente o pacote Argos inglês → português do Brasil
na primeira execução. O cache local permite continuar uma tradução interrompida.
As traduções são automáticas; ajustes culinários verificados devem entrar no
glossário de `translate_themealdb.py` para reaparecer nas futuras atualizações.
