const path = require('path');

exports = module.exports = function () {

  /*
   * S1: __wepy_require(n);
   * S2: require('./lib/sth');
   * S3: require('/vendor.js')(n);
   * S4: import 'xxxx' from 'xxx';j
   */
  this.register('script-dep-fix', function scriptDepFix (parsed, isNPM) {
    let code = parsed.code;
    let fixPos = 0;
    parsed.parser.deps.forEach((dep, i) => {
      let depMod = parsed.depModules[i];
      if (typeof depMod === 'number') {
        depMod = this.vendors.data(depMod);
      }
      let replaceMent = '';
      if (isNPM) {
        replaceMent = `__wepy_require(${depMod.id})`;
      } else {
        if (depMod === false) {
          replaceMent = '{}';
        } else if (!depMod.npm || (depMod.component && depMod.type === 'weapp')) {
          //depMod dep is not a npm package, and it's not a component
          let relativePath = path.relative(path.dirname(parsed.file), depMod.file).replace(/\\/g, '/');
          if (dep.statement && dep.statement.type === 'ImportDeclaration') { // import 'xxxxx' from 'xxxxx';
            replaceMent = `'${relativePath}'`;
          } else {
            replaceMent = `require('${relativePath}')`;
          }
        } else if (!depMod.npm && depMod.component) {
          let relativePath = path.relative(path.dirname(parsed.file), depMod.file);
          let reg = new RegExp('\\' + this.options.wpyExt + '$', 'i');
          relativePath = relativePath.replace(reg, '.js').replace(/\\/g, '/');
          replaceMent = `require('${relativePath}')`;
        } else {
          if (typeof depMod.id === 'number') {
            let relativePath;
            let npmfile = path.join(this.context, this.options.src, 'vendor.js');
            if (parsed.npm) { // This is a npm package
              relativePath = path.relative(path.dirname(this.getModuleTarget(parsed.file, this.options.src)), npmfile);
            } else {
              relativePath = path.relative(path.dirname(parsed.file), npmfile);
            }
            relativePath = relativePath.replace(/\\/g, '/')
            replaceMent = `require('${relativePath}')(${depMod.id})`;
          } else {
            replaceMent = `require('${dep.module}')`;
          }
        }
      }
      parsed.source.replace(dep.expr.start, dep.expr.end - 1, replaceMent);
    });
  });
}
