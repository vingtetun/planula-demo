# planula-demo

## Repo content

/index.html

  Landing page, open it to choose a browser flavor

/patches/

  Tweaks for gecko, bundled as patches

/platform-addons/

  Additional tweaks for gecko, but new code shipped as chrome addons


## How to build'n run

$ git clone https://github.com/vingtetun/planula-demo.git
$ cd planula-demo/
$ sudo python -m SimpleHTTPServer 80 &
  ( or any other way to host this folder on localhost )

$ git clone https://github.com/mozilla/gecko-dev.git
$ cd gecko-dev/
$ cat /home/alex/planula-demo/patches/*.patch | patch -p1
$ ln -s /abs/path/to/planula-demo/platform-addons/ browser/extensions/planula
$ ./mach bootstrap
$ ./mach build
$ ./mach run http://localhost/
