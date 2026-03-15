# HDS — Hot Dawg Script

A simple, kid-friendly programming language that runs entirely in the browser as a PWA (Progressive Web App). No server needed. Works on Windows and Mac.

#
## ✏️ Changing the Syntax

Open `hds-interpreter.js` and edit the `SYNTAX` object at the very top of the file. Every keyword in the language can be renamed freely:

```js
const SYNTAX = {
  print:    'print',    // change to 'say', 'output', 'mostrar' etc.
  set:      'set',      // change to 'let', 'var', 'make' etc.
  if:       'if',
  then:     'then',
  else:     'else',
  end:      'end',
  repeat:   'repeat',
  times:    'times',
  while:    'while',
  do:       'do',
  function: 'function',
  call:     'call',
  return:   'return',
  and:      'and',
  or:       'or',
  not:      'not',
  true:     'true',
  false:    'false',
  comment:  '#',        // comment character (single char)
};
```

The docs panel and example code update automatically — no other changes needed.

## 📖 HDS Language (default syntax)

```
# Variables
set name = "Alex"
set x = 10 + 5

# Print
print "Hello, " + name + "!"

# If / else
if x > 5 then
  print "big!"
else
  print "small!"
end

# Count loop
repeat 5 times
  print "hi"
end

# While loop
set n = 1
while n < 100 do
  print n
  set n = n * 2
end

# Functions
function add(a, b)
  return a + b
end

set result = add(3, 7)
print result

call greet("World")
```

## 🛠 Using the Interpreter in Your Own Code

`hds-interpreter.js` exposes a single `HDS` global:

```js
// Run a program, get output as an array
const { output, error } = HDS.run(`print "hello"`);
// output → ["hello"]
// error  → null  (or an error string if something went wrong)

// Or with a live callback per printed line:
HDS.run(src, line => console.log(line));

// Access the current keyword config:
console.log(HDS.SYNTAX.print); // "print"
```

## 📄 License

MIT — free to use, modify, and distribute.
