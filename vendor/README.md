# Mersenne–Twister MT19937

Source: `mersenne-twister@1.1.0`, https://www.npmjs.com/package/mersenne-twister

The original MT19937 implementation by Makoto Matsumoto and Takuji Nishimura,
wrapped for JavaScript by Sean McCullough, is retained with its BSD license notice.
The only local change is a guard around the CommonJS export so the same file can
be loaded as a browser script. No network dependency is needed at runtime.

The npm archive was verified against its registry integrity value:

`sha512-mUYWsMKNrm4lfygPkL3OfGzOPTR2DBlTkBNHM//F6hGp8cLThY897crAlk3/Jo17LEOOjQUrNAx6DvgO77QJkA==`

Tests compare 2,000 consecutive uint32 outputs against NumPy's independent legacy
MT19937 for seeds 0, 5489 and 4294967295, covering multiple twists.
