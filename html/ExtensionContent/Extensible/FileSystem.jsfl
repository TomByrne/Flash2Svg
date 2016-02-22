(function(ext){

    var FileSystem = {};

    var _lastDoc;
    var _docFile;
    var _docFileBase;
    var _docFileName;
    var _docFolder;

    var checkDoc = function(){
        if(_lastDoc == ext.doc) return;

        _lastDoc = ext.doc;

        if(ext.doc.pathURI){
            _docFile = ext.doc.pathURI;
            if(ext.doc.pathURI.toLowerCase().indexOf(".xfl")==ext.doc.pathURI.length - 4){
                _docFileBase = ext.doc.pathURI.dir;
                _docFolder = fileUri.dir;
            }else{
                _docFileBase = ext.doc.pathURI.stripExtension();
                _docFolder = ext.doc.pathURI.dir;
            }
            _docFileName = _docFileBase.basename;
        }
    }


    FileSystem.uniqueFilePath = function(dir, baseName, ext){
        var path = dir + "/" + baseName + (ext==null ? "" : "." + ext);
        var count = 0;
        while(FLfile.exists(path)){
            path = dir + "/" + baseName + "_" + count + (ext==null ? "" : "." + ext);
            count++;
        }
        return path;
    }

    FileSystem.getRelativePath = function(path, toPath){
        if(toPath == null) toPath = _docFolder;
        
        while(toPath.length){
            if(path.indexOf(toPath) == 0){
                return path.substr(toPath.length);
            }
            var pathWas = toPath;
            toPath = toPath.dir;
            if(pathWas == toPath) return null;
        }
        return null;
    }

    FileSystem.getDocFolder = function(){
        checkDoc();
        return _docFolder;
    }

    FileSystem.getDocFile = function(){
        checkDoc();
        return _docFile;
    }

    FileSystem.getDocFileName = function(){
        checkDoc();
        return _docFileName;
    }

    FileSystem.getDocFileBase = function(){
        checkDoc();
        return _docFileBase;
    }


    FileSystem.getDocFile = function(){
        checkDoc();
        return _docFile;
    }


    ext.extend({FileSystem:FileSystem});
})(extensible);
