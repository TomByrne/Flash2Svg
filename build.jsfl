/* 
 * DAVID BELAIS 2010 DAVID@DISSENTGRAPHICS.COM
 * EXTENSIBLE : A javascript Framework for extending Flash.
 */

(function(ext){
	if(ext){
		ext.builderURI=fl.scriptURI;
	}
	function copy(source,destination){
		var success=true;
		if(FLfile.exists(destination)){
			success=FLfile.remove(destination)
		}
		if(success){
			var isDir=FLfile.getAttributes(source).indexOf('D')>-1;
			if(isDir){
				success=FLfile.createFolder(destination);
				if(success){
					var ch=FLfile.listFolder(source);
					for(var i=0;i<ch.length;i++){
						success=(
							copy(source+'/'+ch[i],destination+'/'+ch[i]) &&
							success 
						);
					}
				}
			}else{
				var moveDir=destination.replace(/\/?[^\/]*?$/g,"");
				if(!FLfile.exists(moveDir)){
					success=FLfile.createFolder(moveDir);
				}
				if(success){
					success=FLfile.copy(source,destination);
					if(!success){
						success=FLfile.write(
							destination,
							FLfile.read(source)
						);
					}
				}
			}
		}
		return success;
	}
	var config=decodeURI(fl.configURI).match(/(^.*)(?=\/Flash CS.)/);
	if(config && config.length>1){
		var configURI=[];
		var folders=FLfile.listFolder(config[0],'directories"');
		for(var i=0;i<folders.length;i++){
			if(/^Flash CS\d$/.test(folders[i])){
				var langFolder=FLfile.listFolder(config[0]+'/'+folders[i],'directories');
				for(var n=0;n<langFolder.length;n++){
					configURI.push(
						config[0]+'/'+folders[i]+'/'+langFolder[n]+'/Configuration'
					);
				}
			}
		}
		var dir=(fl.scriptURI.replace(/\/?[^\/]*?$/g,""));
		var mxi=FLfile.listFolder(dir).filter(
			function(element,index,array){
				return(/\.mxi$/.test(element));
			}
		);
		var completed=[];
		for(i=0;i<mxi.length;i++){
			var xmlString=FLfile.read(dir+'/'+mxi[i])
			if(xmlString){
				var xml=new XML(xmlString.replace(/\<\?.*?\?\>/,''));
				for each(var file in xml..files.file){
					var relativePath=String(file.@source);
					if(completed.indexOf(relativePath)<0){
						completed.push(relativePath);
						var sourceURI=dir+'/'+relativePath;
						if(FLfile.exists(sourceURI)){
							var isDir=FLfile.getAttributes(sourceURI).indexOf('D')>-1;
							var destinationTemplate=String(file.@destination)+'/'+relativePath.split('/').pop();
							var re=/^\$flash/;					
							for(var n=0;n<configURI.length;n++){
								var destinationURI=destinationTemplate.replace(re,configURI[n]);
								var success=copy(sourceURI,destinationURI);
								if(!success){
									fl.trace('Problem copying '+sourceURI+' to '+destinationURI);
								}
							}
						}else{
							fl.trace(sourceURI+' does not exist.');
						}
					}
				}
			}
		}
	}
})(this.extensible)