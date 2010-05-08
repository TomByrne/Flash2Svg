if(!this.extensible){fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");}
(function(ext){
	var fileURL=fl.browseForFileURL('save',"Export SVG");
	if(fileURL && !/\.svg$/.test(fileURL)){
		fileURL+='.svg';
	}
	if(fileURL){
		var svg=new ext.SVG({
			degree:3,
			log:fileURL.stripExtension()+"_svg_log.csv"
		});
		FLfile.write(fileURL,String(svg));
	}
})(extensible)	