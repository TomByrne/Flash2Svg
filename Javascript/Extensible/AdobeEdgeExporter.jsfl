(function(ext){
	function AdobeEdgeExporter(options){

		// Processing states
		this.STATES = [
						{title:"Pre-init", method:this._doInit},
						{title:"Copying Templates", method:this._copyTemplates},
						{title:"Analyse Timelines", method:this._beginTimelineAnalyse},
						{title:"Editing Files", method:this._editFiles},
						{title:"Finished"}
					];

		this.formats = [{id:"edge_1.5", title:"Edge 1.5", templates:"/Templates/edge_1.5"}];

		this._timelineAnalyser = new ext.TimelineAnalyser({collectSymbolItems:true});

		this._templateReplacer = new ext.TemplateReplacer();
		this._templateReplacer.addIterator("timeline", "$$timelineStart", "$$timelineEnd", {}, {"layer":"timeline.layers"}, ext.closure(this,this._onTimelineSelected), ext.closure(this,this._onTimelineDeselected));
		this._templateReplacer.addIterator("layer", "$$layerStart", "$$layerEnd", {"$layerColour":"color"}, {}, ext.closure(this,this._onLayerSelected), ext.closure(this,this._onLayerDeselected));


		var settings=new ext.Object({
			format:this.formats[0]
		});
		settings.extend(options);

		this.settings = settings;
		return this;
	}

	AdobeEdgeExporter.prototype={
		__proto__:Object,
		/**
		 * @property
		 * @see extensible.Object
		 */
		type:AdobeEdgeExporter,
		settings:null,
		callQueue:[],
		currentStateInd:0,
		currentState:null,

		begin: function(){
			this._doState();
		},


		nextState: function(){
			this.currentStateInd++;
			this._doState();

		},
		end: function(){
			this.currentState = this.STATE_DONE;
			this.callQueue = [];
		},




		/**
			Private
		*/

		_docPath:null,
		_docTitle:null,
		_templateReplacer:null,
		_getFormat: function(id){
			for(var i=0; i<this.formats.length; ++i){
				var format = this.formats[i];
				if(format.id==id)return format;
			}
			return null;
		},
		_doState:function(){
			this.currentState = this.STATES[this.currentStateInd];
			if(this.currentState.method)this.callQueue.push(closure(this.currentState.method, [], this));
		},
		_doInit: function(){
			if(typeof(this.settings.format)=="string")this.settings.format = this._getFormat(this.settings.format);

			this._docPath = this.settings.file;
			this._docPath = this._docPath.substring(0, this._docPath.lastIndexOf("."));

			this._docTitle = this._docPath.substring(this._docPath.lastIndexOf("/") + 1);
			this._templateReplacer.addToken("$docTitle", this._docTitle);
		},

		_copyTemplates:function(){
			if(FLfile.exists(this._docPath)){
				if(!FLfile.remove(this._docPath)){
					fl.trace("ERROR: couldn't delete file/folder at "+this._docPath);
				}
			}

			var path = fl.scriptURI;
			path = path.substring(0, path.lastIndexOf("/"));
			path += this.settings.format.templates;
			this._copyFolder(path, this._docPath);
		},
		_copyFolder:function(from, to){
			FLfile.createFolder(to);
			var files =  FLfile.listFolder(from , "files");
			for(var i=0; i<files.length; ++i){
				var file = files[i];
				var newFile = this._templateReplacer.replace(file);
				FLfile.copy(from+"/"+file, to+"/"+newFile);
			}
			var dirs =  FLfile.listFolder(from , "directories");
			for(var i=0; i<dirs.length; ++i){
				var dir = dirs[i];
				var newFile = this._templateReplacer.replace(file);
				this._copyFolder(from+"/"+file, to+"/"+newFile);
			}
		},

		_timelineAnalyser:null,
		_beginTimelineAnalyse:function(){
			var timelines = [];
			for(var i=0; i<this.settings.timelines.length; ++i){
				timelines.push(this.settings.timelines[i].timeline);
			}
			this._timelineAnalyser.begin(timelines);
			this.callQueue.push(ext.closure(this,this._processTimelineAnalyse));
		},
		_processTimelineAnalyse:function(){
			this._timelineAnalyser.callQueue.pop()();
			if(this._timelineAnalyser.callQueue.length)this.callQueue.push(ext.closure(this,this._processTimelineAnalyse));
		},

		_files:null,
		_fileIndex:0,
		_editFiles:function(){
			this._templateReplacer.setIteratorData("timeline", this._timelineAnalyser.results);

			if(!this._files){
				this._files = FLfile.listFolder(this._docPath , "files");
				this._fileIndex = 0;
			}


			if(this._fileIndex >= this._files.length){
				return;
			}

			var fileName = this._files[this._fileIndex];
			var filePath = this._docPath + "/" + fileName;
			var file = FLfile.read(filePath);

			file = this._templateReplacer.replace(file);
			FLfile.write(filePath, file);

			++this._fileIndex;
			this.callQueue.push(ext.closure(this,this._editFiles));
		},


		_onTimelineSelected : function(timeline){
			this._templateReplacer.addToken("$timelineTitle", this._codeSafeString(timeline.timeline.name));
			this._templateReplacer.addToken("$timelineDur", timeline.timeline.frameCount * (1000 / fl.getDocumentDOM().frameRate));
		},
		_onTimelineDeselected : function(timeline){
			this._templateReplacer.removeToken("$timelineTitle");
		},


		_onLayerSelected : function(layer){
			this._templateReplacer.addToken("$layerTitle", this._codeSafeString(layer.name));
			
		},
		_onLayerDeselected : function(layer){
			this._templateReplacer.removeToken("$layerTitle");
		},



		_codeSafeString : function(text){
			return text.replace(/(\s|-)+/g, "_");
		}

	}
	ext.extend({AdobeEdgeExporter:AdobeEdgeExporter});
})(extensible)