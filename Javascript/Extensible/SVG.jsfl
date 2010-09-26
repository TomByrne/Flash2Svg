(function(ext){
	/**
	 * Creates an SVG formatted image.
	 * @this {extensible.SVG}
	 * @constructor
	 * @extends Object
	 * @extends extensible.Task
	 * @parameter {Object} options
	 * @parameter {String} options.file File output URI.
	 * @parameter {Number} options.decimalPointPrecision Decimals are rounded to this many places.
	 * @parameter {Boolean} options.expandSymbols If true, symbols are converted to graphic elements for compatibility w/ Illustrator & Webkit browsers.
	 * @parameter {Boolean} applyTransformations If true, matrices are concatenated and applied to child elements for broader compatibility.
	 * @parameter {Number} curveDegree Determines whether curves are created as Quadratic (2) or Cubic (3) beziers - Quadratic is faster.
	 * @parameter {String} maskingType Determines how masks are applied: 'Alpha','Clipping',or 'Luminance'. Clipping mimicks the way flash displays masks. 
	 * @parameter {Boolean} knockoutBackgroundColor If true, shapes that match the background color will serve as a knockout group.
	 * @parameter {Boolean} convertTextToOutlines If true, text is converted to outlines.
	 * @parameter {String} swfPanelName The name of the swfPanel UI.
	 * @parameter {Boolean} exportSelectedLibraryItems If true, selected library items are exported rather than the stage view.
	 */
	function SVG(options){
		this.DEFAULT_GRADIENT_LENGTH=819.2; // Pre-transformation length of ALL linear gradients in flash.
		this.DEFAULT_GRADIENT_RADIUS=810.7; // Pre-transformation radius of ALL radial gradients in flash.
		this.DEFAULT_BITMAP_SCALE=1/20;
		this.MAX_INLINE_CALL_COUNT=2999; // Max recursions
		this.IDENTITY_MATRIX='matrix(1 0 0 1 0 0)';
		this.DOCUMENT_DATA='SVGExportOptions';
		this.MODULO_STAND_IN='.__';
		var settings=new ext.Object({
			file:undefined,
			decimalPointPrecision:3,
			expandSymbols:'None', // 'Nested', 'All', 'None'
			convertPatternsToSymbols:true,
			applyTransformations:true,
			applyColorEffects:true,
			curveDegree:3,
			maskingType:'Clipping',
			frames:new ext.Array(),
			startFrame:undefined,
			endFrame:undefined,
			animated:false,
			timelines:new ext.Array([]),
			backgroundColor:ext.doc.backgroundColor,
			knockoutBackgroundColor:false,
			includeHiddenLayers:ext.includeHiddenLayers,
			convertTextToOutlines:true,
			includeGuides:false,
			selection:null,
			swfPanelName:null,
			id:String(ext.doc.name.stripExtension().camelCase()),
			x:0,y:0,
			width:ext.doc.width,
			height:ext.doc.height,
			docString:'<?xml version="1.0" encoding="utf-8"?>\n<!-- Generator: flash2svg, http://dissentgraphics.com/tools/flash2svg -->\n',
			version:'1.1',
			baseProfile:'basic',
			log:ext.doc.pathURI.stripExtension()+'.log.csv', // debugging log
			source:'Current Timeline',// 'Current Timeline', 'Selected Library Items'
			clipToScalingGrid:false, // only relevant when source=='Selected Library Items'
			clipToBoundingBox:false // only relevant when source=='Selected Library Items'
		});
		if(
			options instanceof XML ||
			typeof(options)=='string'
		){
			ext.Task.apply(this,[settings]);
			this.settingsXML=this.loadSettings(options);
		}else{
			settings.extend(options);
			ext.Task.apply(this,[settings]);
		}
		if(
			!options && 
			ext.doc.documentHasData(this.DOCUMENT_DATA)
		){
			this.settingsXML=this.loadSettings(
				ext.doc.getDataFromDocument(this.DOCUMENT_DATA)
			);
		}
		if(
			this.file &&
			!/^file\:/.test(this.file)
		){
			this.file=this.file.absoluteURI(ext.doc.pathURI.dir);			
		}
		if(this.frames=='Current'){
			this.frames=new ext.Array([]);
			if(this.source=='Current Timeline'){
				this.startFrame=ext.frame;
				this.endFrame=ext.frame+1;
			}else{
				this.startFrame=0;
				this.endFrame=1;
			}
		}
		if(typeof(this.curveDegree)=='string'){
			this.curveDegree=['','','Quadratic','Cubic'].indexOf(this.curveDegree);
		}
		this.swfPanel=ext.swfPanel(this.swfPanelName); // the swfPanel
		this._timer=undefined;
		this._symbols={};
		this._bitmaps={};
		this._rootItem={};
		this._tempFolder=ext.lib.uniqueName('temp'); // Library folder holding temporary symbols.
		this._ids={}; // Used by uniqueID() for cross-checking IDs.
		this._progressMax=0;
		this._progress=0;
		this._minProgressIncrement=1; // Is later set to this._progressMax/this.MAX_INLINE_CALL_COUNT in order to prevent recursion
		this._origSelection=new ext.Selection([]);
		this._linearProcessing=true;// If true, a timeline is processed one level deep in it's entirety before progressing to descendants.
		if(this.startFrame!==undefined){
			if(
				this.endFrame==undefined ||
				this.endFrame<=this.startFrame
			){
				this.endFrame=this.startFrame+1;
			}
			this.frames=new ext.Array();
			for(
				var i=this.startFrame;
				i<this.endFrame;
				i++
			){
				this.frames.push(i);
			}
		}
		var timeline;
		if(this.source=='Current Timeline'){
			timeline={
				timeline:ext.timeline,
				matrix:ext.viewMatrix,
				frames:new ext.Array([]),
				width:ext.doc.width,
				height:ext.doc.height
			};
			if(this.frames.length){
				timeline.frames.extend(this.frames);
			}else{
				timeline.frames.push(ext.frame);
			}
			this.timelines.push(timeline);
		}else if(this.source=='Selected Library Items'){
			this.timelines.clear();
			var selectedItems=ext.lib.getSelectedItems();
			var width,height;
			for(var i=0;i<selectedItems.length;i++){
				if(selectedItems[i] instanceof ext.SymbolItem){
					timeline=selectedItems[i].timeline;
					if(timeline){selectedItems[i]
						var timeline={
							timeline:timeline,
							matrix:new ext.Matrix(),
							frames:this.frames,
							libraryItem:selectedItems[i]
						};
						if(
							this.clipToScalingGrid &&
							selectedItems[i].scalingGrid
						){
							var rect=selectedItems[i].scalingGridRect;
							timeline.width=rect.right-rect.left;
							timeline.height=rect.bottom-rect.top;
							timeline.matrix.x=-rect.left;
							timeline.matrix.y=-rect.top;
						}else{
							timeline.width=ext.doc.width;
							timeline.height=ext.doc.height;
						}
						this.timelines.push(timeline);
					}
				}
			}
		}
		return this;
	}
	SVG.prototype={
		__proto__:ext.Task,
		/**
		 * @property
		 * @see extensible.Object
		 */
		type:SVG,
		/**
		 * Applies transformation matrices recursively given an SVG graphic element.
		 * @parameter {XML} xml An SVG graphic element or an SVG document. 
		 */
		applyMatrices:function(xml,defs,strokeX){
			strokeX=strokeX||new ext.Matrix();
			xml=xml!==undefined?xml:this.xml;
			defs=defs||xml.defs;
			var bApplyVertices=true;
			var transform,mxs,matrix;
			if(xml.hasOwnProperty('@transform')){
				transform=String(xml['@transform']);
				var mxa=transform.match(/matrix\(.*?\)/g);
				if(mxa && mxa.length){
					matrix=new ext.Matrix(mxa[0]);
					transform=transform.replace(/matrix\(.*?\)/g,'');
				}
				if(transform.trim()==''){
					delete xml['@transform'];
				}else{
					xml['@transform']=transform;
				}
			}
			if(!matrix){
				matrix=new ext.Matrix();
				mxa=[this._getMatrix(matrix)];
			}
			var id=String(xml['@id']);
			var reStrokeX=/^group|drawingObject|rectangleObject|ovalObject|path/;
			if(reStrokeX.test(id)){
				strokeX.concat(matrix.invert());
			}else{
				strokeX=new ext.Matrix();
			}
			if(xml.hasOwnProperty('@filter') && matrix){
				this._transformFilter(matrix,xml,defs);
			}		
			for each(var child in (xml.defs.symbol.*+xml.*)){
				var childName=String(child.localName());
				var cid=child.hasOwnProperty('@id')?String(child['@id']):'';
				var cmx=undefined;
				var tr=child['@transform'];
				var nmx;
				var nmxString;
				if(tr){
					tr=String(tr);
					var cmxa=/matrix\(.*?\)/.exec(tr);
					if(cmxa && cmxa.length){
						cmx=new ext.Matrix(cmxa[0]);
						nmx=cmx.concat(matrix);
						nmxString=this._getMatrix(nmx);
						tr=tr.replace(cmxa[0],nmxString);
					}else{
						tr=mxa[0]+' '+tr;
						nmxString=mxa[0];
						nmx=matrix;
					}
					child['@transform']=tr;
				}else{
					nmx=matrix;
					nmxString=mxa[0];
					child['@transform']=nmxString;
				}				
				if(child.hasOwnProperty('@filter') && child.localName()!='g'){
					this._transformFilter(nmx,child,defs);
				}
				if(bApplyVertices){
					var gradientAttr=['stroke','fill'];
					for(var i=0;i<gradientAttr.length;i++){
						var attrString=child['@'+gradientAttr[i]];
						var gradientID=undefined;
						if(attrString){
							attrString=String(attrString);
							var ida=attrString.match(/(?:url\(#)(.*?)(?:\))/);
							if(ida && ida.length>1){
								gradientID=ida[1];
							}
						}
						if(gradientID!==undefined){
							var gradient=defs.*.(@id==gradientID);
							if(gradient && gradient.length()){
								gradient=gradient[0].copy();
								gradientID=this._uniqueID(String(gradient.@id));
								gradient.@id=gradientID;
								child['@'+gradientAttr[i]]='url(#'+gradientID+')';
								defs.appendChild(gradient);
								if(gradient.localName()=='radialGradient'){
									var gtr=gradient['@gradientTransform'];
									if(gtr){
										gtr=String(gtr);
										var cmxa=/matrix\(.*?\)/.exec(gtr);
										if(cmxa && cmxa.length){
											var cmx=new ext.Matrix(cmxa[0]);
										}else{
											cmx=new ext.Matrix();
										}
									}else{
										cmx=new ext.Matrix();
									}
									var gmx=cmx.concat(nmx);
									var fp=new ext.Point({
										x:Number(gradient['@fx']),
										y:Number(gradient['@fy'])
									});
									var cp=new ext.Point({
										x:Number(gradient['@cx']),
										y:Number(gradient['@cy'])
									});
									var rp=new ext.Point({
										x:cp.x+Number(gradient['@r']),
										y:cp.y
									});
									var mx=new ext.Matrix({
										a:gmx.scaleX,
										b:0,
										c:0,
										d:gmx.scaleX,
										tx:gmx.tx,
										ty:gmx.ty
									});
									fp=fp.transform(mx).roundTo(this.decimalPointPrecision);
									cp=cp.transform(mx).roundTo(this.decimalPointPrecision);
									rp=rp.transform(mx).roundTo(this.decimalPointPrecision);
									gmx=mx.invert().concat(gmx).roundTo(this.decimalPointPrecision);
									gradient['@r']=String(Math.roundTo(cp.distanceTo(rp),this.decimalPointPrecision));
									gradient['@cx']=String(cp.x);
									gradient['@cy']=String(cp.y);
									gradient['@fx']=String(fp.x);
									gradient['@fy']=String(fp.y);
									var gmxString=this._getMatrix(gmx);
									if(gtr){
										gtr=gtr.replace(cmxa[0],gmxString);
									}else{
										gtr=gmxString;
									}
									gradient['@gradientTransform']=gtr;
								}else if(gradient.localName()=='linearGradient'){
									var p1=new ext.Point({
										x:Number(gradient['@x1']),
										y:Number(gradient['@y1'])
									});
									var p2=new ext.Point({
										x:Number(gradient['@x2']),
										y:Number(gradient['@y2'])
									});
									p1=p1.transform(nmx).roundTo(this.decimalPointPrecision);
									p2=p2.transform(nmx).roundTo(this.decimalPointPrecision);
									gradient['@x1']=String(p1.x);
									gradient['@y1']=String(p1.y);
									gradient['@x2']=String(p2.x);
									gradient['@y2']=String(p2.y);
								}else if(gradient.localName()=='pattern'){
									var ptr=gradient.@patternTransform;
									if(ptr){
										ptr=String(ptr);
										var pmxa=/matrix\(.*?\)/.exec(ptr);
										if(pmxa && pmxa.length){
											var pmx=new ext.Matrix(pmxa[0]);
										}else{
											pmx=new ext.Matrix();
										}
									}else{
										pmx=new ext.Matrix();
									}
									gradient.@patternTransform=this._getMatrix(pmx.concat(nmx));
								}
							}
						}
					}
					if(child.hasOwnProperty('@d')){
						var curveData=child['@d'];
						var points=curveData.match(/[A-Ya-y]?[\d\.\-]*[\d\.\-][\s\,]*[\d\.\-]*[\d\.\-][Zz]?/g);
						if(points && points.length){
							var newPoints=new ext.Array([]);
							for(var i=0;i<points.length;i++){
								if(points[i].trim()==''){continue;}
								var point=new ext.Point(points[i]);
								point=point.transform(nmx).roundTo(this.decimalPointPrecision);
								var pointString=String(point.x)+','+String(point.y);
								var prefix=/^[A-Za-z]/.exec(points[i]);
								if(prefix){
									pointString=prefix[0]+pointString;
								}
								var suffix=/[A-Za-z]$/.exec(points[i]);
								if(suffix){
									pointString=pointString+suffix[0];
								}
								newPoints.push(pointString);							
							}
							child['@d']=newPoints.join(' ');
							child['@transform']=String(child['@transform']).replace(nmxString,'');
							if(String(child['@transform']).trim()==''){
								delete child['@transform'];
							}
						}
					}
					if(child.hasOwnProperty('@stroke-width')){
						var strokeScale=cmx?nmx.concat(strokeX.concat(cmx.invert())):nmx.concat(strokeX);
						child['@stroke-width']=Math.roundTo(Number(child['@stroke-width'])*((strokeScale.scaleX+strokeScale.scaleY)/2),this.decimalPointPrecision);
					}
					
				}
				if(child.* && child.*.length() && childName!='defs'){
					this.applyMatrices(child,defs,strokeX?(cmx?strokeX.concat(cmx.invert()):strokeX):undefined);
				}
			}
			return xml;
		},
		_applyColorEffects:function(xml,defs,colorX){
			var name=xml.localName();
			if( name=='filter' || /Gradient/.test(name) || /Color/.test(name)){
				return;	
			}
			if(name=='mask' && xml..use.length()>0){
				this.expandUse( xml,true,defs );
			}
			defs=(
				defs instanceof XML ?
				defs:(
					xml.defs instanceof XML ?
					xml.defs:
					this.xml.defs
				)
			);
			var filter,newFilter;
			var color=colorX;
			if(xml.hasOwnProperty('@filter')){
				var filterID=String(xml.@filter).match(/(?:url\(#)(.*?)(?:\))/);
				if(filterID && filterID.length>1){
					filter=defs.filter.(@id==filterID[1]);
					if(filter){
						if(filter.length()){
							filter=filter[0];
							color=this._colorFromEffect(filter);
							if(color){
								var n=0;
								if(!color.amount.is([0,0,0,0])){
									n+=1;
								}
								if(!color.percent.is([100,100,100,100])){
									n+=1;
								}
								if(filter.*.length()<=n){
									delete xml.@filter;
								}else{
									newFilter=filter.copy();
									var newFilterID=this._uniqueID(String(newFilter.@id));
									newFilter.@id=newFilterID;
									xml.@filter="url(#"+newFilterID+")";
									if(!color.amount.is([0,0,0,0])){
										delete newFilter.feComponentTransfer.(@result=='colorEffect_amount');
									}
									if(!color.percent.is([100,100,100,100])){
										delete newFilter.feColorMatrix.(@result=='colorEffect_percent');
									}
									defs.appendChild(newFilter);
									filter=newFilter;
								}
							}
						}else{
							delete xml.@filter;
						}
					}
				}
			}
			if(color){
				var painted=false;
				var paintProperties=[
					'fill',
					'stroke'
				];
				for(var i=0;i<paintProperties.length;i++){
					if(xml.hasOwnProperty('@'+paintProperties[i])){
						painted=true;
						var paintStr=String(xml['@'+paintProperties[i]]);
						var paintID=paintStr.match(/(?:url\(#)(.*?)(?:\))/);
						if(paintID && paintID.length>1){
							paintID=paintID[1];
							var paint=defs.*.(@id==paintID);
							if(paint && paint.length()){
								for each(var stop in paint[0].stop){
									var stopColor=new ext.Color(
										String(stop['@stop-color'])
									);
									if(stop.hasOwnProperty('@stop-opacity')){
										stopColor.amount[3]=Number(stop['@stop-opacity'])*255;
									}else{
										stopColor.amount[3]=255;
									}
									var newColor=color.transform(stopColor);
									stop['@stop-color']=newColor.hex;
									stop['@stop-opacity']=newColor.opacity;
								}
							}
						}else if(paintStr[0]=='#'){
							var newColor=new ext.Color(paintStr);
							if(xml.hasOwnProperty('@'+paintProperties[i]+'-opacity')){
								newColor.amount[3]=Number(xml['@'+paintProperties[i]+'-opacity'])*255;
							}else{
								newColor.amount[3]=255;
							}
							newColor=color.transform(newColor);
							xml['@'+paintProperties[i]]=newColor.hex;
							xml['@'+paintProperties[i]+'-opacity']=newColor.opacity;
						}
					}
				}
				if(
					!painted &&
					xml.*.length()==(
						xml.animate?xml.animate.length():0+
						xml.animateMotion?xml.animateMotion.length():0+
						xml.animateColor?xml.animateColor.length():0+
						xml.animateTransform?xml.animateTransform.length():0
					)
				){
					var f=this._getFilters(
						null,{color:color},defs
					);
					
					if(xml.hasOwnProperty('@filter') && filter){
						for each(var fe in defs.filter.(@id==f).*){
							filter.appendChild(fe);	
						}
					}else{
						xml.@filter='url(#'+f+')';	
					}
				}
			}
			for each(var element in xml.*){
				this._applyColorEffects(element,defs,color);
			}
		},
		_colorFromEffect:function(filter){
			var feAmount=filter.feComponentTransfer.(@result=='colorEffect_amount');
			var fePercent=filter.feColorMatrix.(@result=='colorEffect_percent');
			if(!(feAmount.length() || fePercent.length())){
				return;
			}
			var color=new ext.Color([0,0,0,0]);
			var n=0;
			if(feAmount.length()){
				n+=1;
				feAmount=feAmount[feAmount.length()-1];
				if(feAmount.feFuncR.length()){
					if(feAmount.feFuncR.hasOwnProperty('@intercept')){
						color.amount[0]=Number(feAmount.feFuncR.@intercept)*255;
					}
				}
				if(feAmount.feFuncG.length()){
					if(feAmount.feFuncG.hasOwnProperty('@intercept')){
						color.amount[1]=Number(feAmount.feFuncG.@intercept)*255;
					}
				}
				if(feAmount.feFuncB.length()){
					if(feAmount.feFuncB.hasOwnProperty('@intercept')){
						color.amount[2]=Number(feAmount.feFuncB.@intercept)*255;
					}
				}
				if(feAmount.feFuncA.length()){
					if(feAmount.feFuncA.hasOwnProperty('@intercept')){
						color.amount[3]=Number(feAmount.feFuncA.@intercept)*255;
					}
				}
			}
			if(fePercent.length()){
				n+=1;
				fePercent=fePercent[fePercent.length()-1];
				var values=String(fePercent.@values).match(/[\d\.\-]*\d/g);
				if(values.length>16){
					color.percent[0]=values[0]*100;
					color.percent[1]=values[6]*100;
					color.percent[2]=values[12]*100;
					color.percent[3]=values[18]*100;
				}
			}
			return color;
		},
		_transformFilter:function(matrix,element,defs){
			defs=defs||element.defs;
			if(!defs){
				return;
			}
			if(element.hasOwnProperty('@filter')){
				var filterID=String(
					element.@filter
				).match(
					/(?:url\(#)(.*?)(?:\))/
				);
				if(
					filterID &&
					filterID.length>1
				){
					var filter=defs.filter.(@id==filterID[1]);
					if(filter && filter.length()){
						var sx=matrix.scaleX;
						var sy=matrix.scaleY;
						for each(var primitive in filter[0].*){
							switch(primitive.localName()){
								case "feGaussianBlur":
									var blur=new ext.Point(String(primitive.@stdDeviation));
									primitive.@stdDeviation=[
										blur.x*sx,
										blur.y*sy
									].join(' ');
									break;
							}
						}			
						var x=parseFloat(filter.@x);
						var y=parseFloat(filter.@y);
						var width=parseFloat(filter.@width);
						var height=parseFloat(filter.@height);
						filter.@x=String(x/(1-sx))+'%';
						filter.@y=String(y/(1-sy))+'%';
						filter.@width=String(100+(width-100)/(1-sx))+'%';
						filter.@height=String(100+(height-100)/(1-sy))+'%';						
					}								
				}
			}
			return filter[0];
		},
		/**
		 * Begins processing. 
		 * @see extensible.Task
		 */
		begin:function(){
			fl.showIdleMessage(false);
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='begin';
				return;
			}
			if(this.log && typeof(this.log)=='string'){
				ext.startLog({url:this.log});
				this._timer=ext.log.startTimer('extensible.SVG()');
				var timer=ext.log.startTimer('extensible.SVG.begin()');
			}
			var i,n;
			if(this.swfPanel){
				for(i=0;i<this.timelines.length;i++){
					for(n=0;n<this.timelines[i].frames.length;n++){
						this._progressMax+=this._getProgressIncrements(
							this.timelines[i].timeline,
							this.timelines[i].frames[n],
							true
						);
					}
				}
				this._minProgressIncrement=this._progressMax/this.MAX_INLINE_CALL_COUNT;
			}
			this._origSelection=ext.sel;
			ext.doc.selectNone(); // selection slows performance & can cause crashes
			this.xml=new XML('<svg xmlns:xlink="http://www.w3.org/1999/xlink"/>');
			this.xml['@id']=this.id;
			this.xml['@image-rendering']='optimizeSpeed';
			this.xml['@baseProfile']=this.baseProfile;
			this.xml['@version']=this.version;
			this.xml['@style']="background-color:"+this.backgroundColor;
			this.xml['@x']=String(this.x)+'px';
			this.xml['@y']=String(this.y)+'px';
			this.xml['@width']=String(this.width)+'px';
			this.xml['@height']=String(this.height)+'px';
			var vb=String(this.x)+' '+String(this.y)+' '+String(this.width)+' '+String(this.height);
			this.xml['@viewBox']=vb;
			this.xml['@enable-background']='new '+vb;
			this.xml['@xml:space']='preserve';
			this.xml.appendChild(new XML('<defs/>'));
			for(i=0;i<this.timelines.length;i++){
				for(n=0;n<this.timelines[i].frames.length;n++){
					var x=this._getTimeline(
						this.timelines[i].timeline,
						{
							matrix:this.timelines[i].matrix,
							frame:this.timelines[i].frames[n],
							selection:this.selection,
							libraryItem:this.timelines[i].libraryItem,
							isRoot:true
						}
					);
					if(
						this.timelines[i].matrix.is(new ext.Matrix()) &&
						this.timelines.length==1 &&
						(this.timelines[i].frames.length==1 || this.animated)
					){ // skip unnecessary identity matrix
						for each(var e in x.*){
							this.xml.appendChild(e);
						}
					}else{
						this.xml.appendChild(x);
					}
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			this.process();
		},
		/**
		 * Ends processing.
		 * @see extensible.Task
		 */
		end:function(){
			var success=true;
			var fileExists=FLfile.exists(this.file);
			/*
			 * If the target is a file and needs to be a folder, delete it first,
			 * and vice-versa.
			 */
			if(
				this.file && 
				fileExists && (
					(
						(
							this.timelines.length > 1 ||
							this.frames.length > 1
						) && (
							FLfile.getAttributes(
								this.file
							).indexOf("D")<0
						)
					)||(
						(
							this.timelines.length==1 &&
							this.frames.length==1
						) && (
							FLfile.getAttributes(
								this.file
							).indexOf("D")>-1
						)
					)
				)
			){
				FLfile.remove(this.file);
				fileExists=false;
			}
			var documents;
			if(
				this.timelines.length==1 &&
				this.frames.length==1
			){
				documents=new ext.Array([this.xml]);
			}else{
				documents=this._splitXML(this.xml);
				if(this.file && !fileExists){
					success=FLfile.createFolder(this.file);
				}
				if(!success){
					throw new Error('Problem creating folder.');
				}
			}
			var writeSuccess=true;
			for(var i=0;i<documents.length;i++){
				if(this.expandSymbols && this.expandSymbols!='None'){ // expand symbol instances
					if(this.expandSymbols=='Nested'){
						this.expandUse(documents[i],'nested',documents[i].defs);
					}else{
						this.expandUse(documents[i]);
					}
				}
				if(this.applyTransformations){
					this.applyMatrices(documents[i]);
				}
				this._applyColorEffects(documents[i],documents[i].defs);
				this.deleteUnusedReferences(documents[i]);
				documents[i]['@xmlns']="http://www.w3.org/2000/svg";
				if(this.file){
					var outputString=(
						this.docString+
						documents[i].toXMLString().replace(
							/(<[^>]*?)xlink-(.*?)="/g,
							'$1xlink:$2="'
						)
					);
					if(documents.length==1){
						success=FLfile.write(this.file,outputString);
					}else{
						var rPath=decodeURIComponent(
							String(
								documents[i].@id
							).replace(
								this.MODULO_STAND_IN,
								'%',
								'g'
							)
						);
						var rPathArray=rPath.split('/');
						for(var n=0;n<rPathArray.length;n++){
							rPathArray[n]=rPathArray[n].safeFileName();
						}
						rPath=rPathArray.join('/');
						if(rPathArray.length>1){
							var rDir=rPath.dir;
							if(!FLfile.exists(rDir)){
								FLfile.createFolder(this.file+'/'+rDir);
							}
						}
						var outputPath=(
							this.file+'/'+
							rPath+'.svg'
						);
						success=FLfile.write(
							outputPath,
							outputString
						);
					}
					if(!success){
						ext.warn('Problem writing '+outputPath||this.file);
					}
				}
			}
			fl.showIdleMessage(true);
			if(this.log){
				ext.stopLog();
			}
			/*
			 * cleanup temporary items
			 */
			if(ext.lib.itemExists(this._tempFolder)){
				ext.lib.deleteItem(this._tempFolder);	
			}
			ext.sel=this._origSelection;
			var epSuccess=true;
			if(this.swfPanel){
				epSuccess=this.swfPanel.call('endProgress');	
			}
			if(writeSuccess && epSuccess){
				ext.message('Export Successful: '+this.file);
			}
			return(writeSuccess && epSuccess && this.que.next());
		},
		/**
		 * Expands symbol instances ( use tags ).
		 * @parameter {XML} xml An svg document or graphic element.
		 * @parameter {Boolean} recursive
		 * @parameter {XML} defs
		 */
		expandUse:function( xml,recursive,defs ){
			defs=defs||xml.defs||this.xml.defs;
			if(recursive==undefined){
				recursive=true;
			}
			var rootIsUse=(
				xml.localName()=='use'
			);
			for each(
				var useNode in (
					recursive ? (
						rootIsUse ? xml : xml..use
					):(
						rootIsUse ? xml : xml.use
					)
				)
			){
				if( useNode.localName()!='use' || !useNode['@xlink-href'] ){
					continue;
				}
				var id=String(useNode['@xlink-href']).slice(1);
				var symbol=defs.symbol.(@id==id);
				if(
					!symbol || 
					!symbol.length() || (
						recursive=='nested' && !(
							symbol[0]..use && 
							symbol[0]..use.length()
						)
					)
				){
					continue;
				}
				symbol=symbol[0].copy();
				if(recursive){
					symbol=this.expandUse(symbol,recursive,defs);
				}
				useNode.setName('g');
				for each(var child in symbol.*){
					useNode.appendChild(child);
				}
				useNode['@id']=this._uniqueID(String(symbol['@id'])+'_1');
				delete useNode['@xlink-href'];
				delete useNode['@width'];
				delete useNode['@height'];
				delete useNode['@x'];
				delete useNode['@y'];
				if(useNode['@transform']==this.IDENTITY_MATRIX){
					delete useNode['@transform'];
				}
				for each(var node in useNode..*){
					if(node.hasOwnProperty('@id') && node.localName()!='mask'){
						node.@id=this._uniqueID(String(node.@id));
					}
					if(node.hasOwnProperty('@mask')){
						var oldID=String(node.@mask).match(/(?:url\(#)(.*?)(?:\))/);
						if(oldID && oldID.length>1){
							var newID=this._uniqueID(oldID[1]);
							var old=useNode.(@id==oldID[1]);
							if(old.length()){
								old[0].@id=newID;
								node.@mask='url(#'+newID+')';
							}
						}
					}
					for each(var attr in node.@*){
						if(attr.name()!='id'){
							var ida=String(attr).match(/(?:url\(#)(.*?)(?:\))/);
							if(ida && ida.length>1){
								var origDef=defs.*.(@id==ida[1]);
								if(origDef && origDef.length()){
									var newDef=origDef[0].copy();
									var newID=this._uniqueID(ida[1]);
									newDef.@id=newID;
									node['@'+attr.name()]='url(#'+newID+')';
									defs.appendChild(newDef);
								}
							}
						}
					}
				}
			}
			if( rootIsUse && recursive ){
				this.expandUse( xml,recursive,defs );
			}
			return xml;
		},
		/**
		 * Deletes unreferenced defs.
		 * @parameter {XML} xml
		 */
		deleteUnusedReferences:function(xml){
			xml=xml||this.xml;
			if(!xml.defs || xml.defs.length()==0){
				return xml;	
			}
			var refs=this._listReferences(xml);
			var references=xml.defs.*.copy();
			delete xml.defs.*;
			for each(var def in references){
				if(
					refs.indexOf(String(def.@id))>=0 && (
						def.localName()!='filter' ||
						def.*.length()>0
					)
				){
					xml.defs.appendChild(def);
				}
			}
			return xml;
		},
		/**
		 * Retrieves a list of references used.
		 * @parameter {XML} xml
		 */
		_listReferences:function(xml,defs){
			defs=defs||xml.defs;
			var refs=new ext.Array();
			if(!defs){return refs;}
			for each(var x in xml.*){
				if(x.localName()!='defs'){
					for each(var a in x.@*){
						var reference=(
							String(a).match(/(?:url\(#)(.*?)(?:\))/)||
							String(a).trim().match(/(?:^#)(.*$)/)
						);
						if(
							(reference instanceof Array) &&
							reference.length>1
						){
							var ref=defs.*.(@id==reference[1]);
							if(ref && ref.length()){
								refs.push(reference[1]);
								refs.extend(this._listReferences(ref[0],defs));
							}
							
						}
					}
					if(x.*.length()){
						refs.extend(
							this._listReferences(x,defs)
						);
					}
				}
			}
			return refs;
		},
		/**
		 * Loads an xml settings file.
		 * @parameter {String} uri The location of the settings file.
		 */
		loadSettings:function(xml){
			if(typeof(xml)=='string'){
				xml=new XML(xml);
			}
			for each(var x in xml.*){
				var key=String(x.name());
				if(
					['true','false','True','False'].indexOf(String(x))>-1
				){
					this[key]=(
						String(x)!=='false' &&
						String(x)!=='False' &&
						String(x)!=='0'
					);
				}else if(
					String(x).replace(/[^\d\.\-\W]/g,'')==String(x)
				){
					this[key]=Number(x);
				}else{
					this[key]=String(x);
				}
			}
			return xml;
		},
		/**
		 * Inherited from extensible.Task, this method processes data incrementally, providing the
		 * opportunity for the swfPanel and/or que to update progress or interupt processing if necessary.		 * 
		 * @see extensible.Task
		 */
		process:function(){
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='process';
				return true;
			}
			if(this.qData.length>0){
				if(this.swfPanel){
					var progressGoal=(
						this._progress+this._minProgressIncrement<this._progressMax?
						this._progress+this._minProgressIncrement
						:this._progressMax
					);
				}
				while(
					this.qData.length
					&& ( !this.swfPanel || this._progress<progressGoal )
				){
					var args=this.qData.shift();
					var id=args.shift();
					// e4x filters caused memory errors on larger files
					// so we use a regular expression...
					var elementXML=this._getElement(args[0],args[1]);
					if(elementXML){
						this.xml=new XML(
							this.xml.toXMLString().replace(
								new RegExp('<g.*? id="'+id+'".*?\/>'),
								elementXML.toXMLString()
							)
						);
					}	
					if(!this.swfPanel){ break; }				
				}
				if(this.swfPanel){
					var success=Boolean(
						this.swfPanel.call.attempt(
							this.swfPanel,
							[ 'setProgress', this._progress, this._progressMax ],
							this.MAX_INLINE_CALL_COUNT
						)=='true'
					);
					if(!success){
						ext.warn('Problem communicating with swfPanel.');
						return this.que.process();
					}
				}else{
					return this.que.process();
				}
			}else{
				return this.end();
			}
			return true;
		},
		/**
		 * Retrieves an arbitrary measurement of the time an element
		 * will take to translate, used for passing progress to the swfPanel.
		 * @parameter {extensible.Element} element
		 * @parameter {Number} frame
		 * @parameter {Boolean} recursive
		 */
		_getProgressIncrements:function(element,frame,recursive){
			if(typeof(frame)!='number'){frame=0;}
			var BREAK_TWEEN_VALUE=10;
			var BREAK_TEXT_VALUE=20;
			var ELEMENT_VALUE=5;
			var timeline;
			var increments;
			if(element instanceof Timeline){
				timeline=new ext.Timeline(element);
			}else if(element instanceof ext.Timeline){
				timeline=element;
			}else{
				if(element instanceof ext.SymbolInstance){
					var frame=element.getCurrentFrame(frame);
					var increments=this._getProgressIncrements(
						element.timeline,
						frame,
						recursive
					);
					return increments;
				}else{
					if(element instanceof ext.Shape){
						return  ELEMENT_VALUE+element.numCubicSegments;
					}else if(element instanceof ext.Text || element instanceof ext.TLFText){
						return  ELEMENT_VALUE+BREAK_TEXT_VALUE;
					}else{
						return  ELEMENT_VALUE;
					}
				}
			}
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG.getProgressIncrements()');
			}
			if(!timeline.cache.progressIncrements){
				timeline.cache.progressIncrements=[];	
			}
			if(timeline.cache.progressIncrements[frame]){
				return timeline.cache.progressIncrements[settings.frame];
			}
			var frames=timeline.getFrames({
				position:frame,
				includeHiddenLayers:this.includeHiddenLayers,
				includeGuides:this.includeGuides
			});			
			increments=ELEMENT_VALUE;
			for(var k=0;k<frames.length;k++){
				if(frames[k].tweenType!=='none'){
					increments+=BREAK_TWEEN_VALUE*frames[k].duration;
				}
				if(recursive){
					var elements=frames[k].elements.expandGroups();
					for(var i=0;i<elements.length;i++){
						increments+=this._getProgressIncrements(
							elements[i],
							frame,
							true
						);
					}
				}
			}
			timeline.cache.progressIncrements[frame]=increments;
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return increments;
		},
		/**
		 * Retrieves the svg data corresponding to a DOM Element.
		 * @parameter {extensible.Element} element
		 * @parameter {Object} options Options object, contents dependant on element type.
		 * @private
		 */
		_getElement:function(element,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getElement()');	
			}
			var settings=new ext.Object({});
			settings.extend(options);
			var result;
			if(this.swfPanel){
				var progressIncrements=this._getProgressIncrements(
					element,
					settings.frame
				);
				if(progressIncrements){
					this._progress+=progressIncrements;
				}else{
					ext.warn(
						'extensible.SVG.getElement()\n\t'+progressIncrements+'\n\t'+e
					);
				}
			}
			if(element instanceof ext.Instance){
				if(element.instanceType=='symbol'){
					result=this._getSymbolInstance(element,settings);
				}else if(element.instanceType=='bitmap'){
					result=this._getBitmapInstance(element,settings);
				}
			}else{
				if(element instanceof ext.Shape){
					result=this._getShape(element,settings);
				}else if(
					element instanceof ext.Text || 
					element instanceof ext.TLFText
				){
					result=this._getText(element,settings);
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return result;
		},
		/**
		 * Retrieves the SVG data corresponding to a timeline.
		 * @parameter {extensible.timeline) timeline
		 * @parameter {Object} options
		 * @parameter {Number} [options.frame] The frame number.
		 * @parameter {Number} [options.id] The id to use for the element.
		 * @parameter {Matrix} [options.matrix]
		 * @parameter {Item} [options.libraryItem] The library item 
		 * @parameter {String} [options.color] A hexadecimal color value.
		 * @private
		 */
		_getTimeline:function(timeline,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getTimeline()');	
			}
			var settings=new ext.Object({
				frame:0,
				selection:undefined,
				id:undefined,
				matrix:new ext.Matrix(),
				libraryItem:undefined,
				color:undefined,
				isRoot:false
			});
			settings.extend(options);
			if(typeof(settings.color)=='string'){
				settings.color=new ext.Color(settings.color);
			}
			/*
			 * Check to see if the timeline has tweens that we need to resolve.
			 */
			var hasTweens=false;
			var frames,tempName;
			if(settings.libraryItem){ // it's a symbol
				tempName=this._tempFolder+'/'+settings.libraryItem.name;
			}
			if(tempName && ext.lib.itemExists(tempName)){ // a temporary symbol has already been created
				hasTweens=true;
			}else{
				frames=timeline.getFrames({ // get a list of currently visible frames
					position:settings.frame,
					includeHiddenLayers:this.includeHiddenLayers,
					includeGuides:this.includeGuides
				});
				for(var i=0;i<frames.length;i++){ // check for tweens
					if(
						frames[i].tweenType!='none' &&
						settings.frame!=frames[i].startFrame
					){
						hasTweens=true;
						break;
					}
				}
			}
			/*
			 * Create temporary timelines where tweens exist & convert to
			 * keyframes.
			 */
			var originalScene,timelines;
			if(hasTweens){
				if(settings.libraryItem==undefined){
					originalScene=timeline.name;
					ext.doc.duplicateScene();
					timelines=ext.doc.timelines;
					timeline=new ext.Timeline(timelines[timelines.length-1]);
				}else{
					if(ext.lib.itemExists(tempName)){
						ext.lib.selectItem(tempName);
					}else{
						if(!ext.lib.itemExists(tempName.dir)){
							ext.lib.addNewItem('folder',tempName.dir);
						}
						ext.lib.selectItem(settings.libraryItem.name);
						ext.lib.duplicateItem();
						ext.lib.moveToFolder(tempName.dir);
						ext.lib.renameItem(tempName.basename);
					}
					timeline=new ext.Timeline(ext.lib.getSelectedItems()[0].timeline);
				}
				var layers=timeline.getLayers();
				var ranges=new ext.Array();
				for(var i=0;i<layers.length;i++){
					var range=new ext.Array();
					var l=layers[i];
					if(l.frameCount>settings.frame){
						var f=l.frames[settings.frame];
						if(f.tweenType!='none'){
							var start=f.startFrame;
							var end=start+f.duration;
							for(
								var i=0;
								i<l.frameCount &&
								end<l.frameCount &&
								l.frames[end].tweenType!='none';
								i++
							){
								var pEnd = end + l.frames[end].duration;
								if (l.frames[pEnd]){
									end=pEnd;
								}else{
									break;
								}
							}
							range.push(start);
							range.push(end);						
						}
					}
					ranges.push(range);
				}
				var success=false;
				success=timeline.convertToKeyframes(ranges);
			}
			/*
			 * Retrieve elements in the current frames.
			 */
			if(!settings.selection){
				var options={
					includeHiddenLayers:this.includeHiddenLayers,
					includeGuides:this.includeGuides
				};
				if(hasTweens){
					options.frame=settings.frame;
				}else{
					options.frames=frames;
				}
				settings.selection=timeline.getElements(options);
			}
			/*
			 * Group elements by layer.
			 */
			var selection=settings.selection.byFrame({stacked:true});
			var xml,instanceXML,id;
			var transformString=this._getMatrix(settings.matrix);
			var timelineName=timeline.name;
			/*
			 * If the timeline is a symbol ( has a libraryItem ), 
			 * we either create a symbol definition or use the existings one.
			 */
			if(settings.libraryItem){
				var symbolIDString=settings.libraryItem.name;
				if(settings.frame!=0){
					symbolIDString+='/'+String(settings.frame);
				}
				if(settings.color){
					symbolIDString+='/'+settings.color.idString;
				}
				var isNew,instanceID;
				if(
					this._symbols[settings.libraryItem.name] &&
					this._symbols[settings.libraryItem.name][settings.frame]
				){
					isNew=false;
					id=this._symbols[settings.libraryItem.name][settings.frame].id;
				}else{
					isNew=true;
					id=this._uniqueID(symbolIDString);
					if(!this._symbols[settings.libraryItem.name]){
						this._symbols[settings.libraryItem.name]=new ext.Array();	
					}
					this._symbols[settings.libraryItem.name][settings.frame]=new ext.Array();
					this._symbols[settings.libraryItem.name][settings.frame].id=id;
					//this._symbols[symbolIDString]=id;
				}				
				var instanceID=this._uniqueID(id);	
				xml=new XML('<use xlink-href="#'+id+'" id="'+instanceID+'" />');
				if(isNew){
					instanceXML=xml;
					instanceXML['@width']=0;
					instanceXML['@height']=0;
					instanceXML['@x']=0;
					instanceXML['@y']=0;
					instanceXML['@transform']=transformString;
					instanceXML['@overflow']="visible";
					xml=new XML('<symbol/>');
					xml['@id']=id;
				}else{
					var vb=String(this.xml.defs.symbol.(@id==id)[0]['@viewBox']).split(' ');
					xml['@width']=vb[2];
					xml['@height']=vb[3];
					xml['@x']=vb[0];
					xml['@y']=vb[1];
					xml['@transform']=transformString;
					xml['@overflow']="visible";
					selection.clear();
				}
			}else{
				id=this._uniqueID(timelineName+'/'+settings.frame);
				xml=new XML('<g id="'+id+'" />');
				if(settings.matrix && !settings.matrix.is(new ext.Matrix())){
					xml['@transform']=transformString;
				}
			}
			if(settings.isRoot){
				if(!this._rootItem[timelineName]){
					this._rootItem[timelineName]=new ext.Array();
				}
				this._rootItem[timelineName][settings.frame]=id;
			}
			/*
			 * Loop through the visible frames by layer &
			 * either take note of the elements for linear
			 * processing ( enables use of a progress bar ), 
			 * or process them immediately ( for debugging purposes ).
			 */
			var masked=new ext.Array();
			var boundingBox=settings.selection.boundingBox;
			for(var i=0;i<selection.length;i++){
				if(selection[i] && selection[i].length>0){
					var layer=selection[i][0].layer;
					var lVisible=layer.visible;
					var lLocked=layer.locked;
					if(!lVisible){layer.visible=true;}
					if(lLocked){layer.locked=false;}
					var layerXML;
					var id=this._uniqueID(layer.name);
					if(settings.libraryItem){
						this._symbols[settings.libraryItem.name][settings.frame][i]=id;
					}else if(settings.isRoot){
						this._rootItem[timelineName][settings.frame][i]=id;
					}
					/*
					 * If the masking type is "Alpha" or "Clipping"
					 * we need to manipulate the color of the mask to ensure
					 * the proper behavior
					 */
					var filtered;
					var isMasked=false;
					if(layer.layerType=='mask'){
						var colorX=null;
						if(this.maskingType=='Alpha'){
							colorX=new ext.Color('#FFFFFF00');
						}else if(this.maskingType=='Clipping'){
							colorX=new ext.Color('#FFFFFF00');
							colorX.percent[3]=999999999999999;						
						};
						layerXML=<mask id={id}/>;
						if(colorX){
							filtered=<g id={this._uniqueID('g')} />;
							layerXML.appendChild(filtered);
							var f=this._getFilters(
								null,{
									color:colorX,
									boundingBox:boundingBox
								}
							);
							if(f){
								filtered.@filter="url(#"+f+")";
							}
						}
					}else if(
						layer.layerType=='masked' && (
							layer.parentLayer && 
							(layer.parentLayer.visible || this.includeHiddenLayers) &&
							(layer.parentLayer.layerType!='guide' || this.includeGuides)
						)
					){
						isMasked=true;
						layerXML=new XML('<g id="'+id+'" />');
					}else{
						layerXML=new XML('<g id="'+id+'" />');
					}
					var layerID=id;
					for(var n=0;n<selection[i].length;n++){
						var elementID=this._uniqueID('element');
						var element=new XML('<g id="'+elementID+'"></g>');
						if(this._linearProcessing){
							this.qData.push([
								elementID,
								selection[i][n],
								{
									frame:settings.frame
								}
							]);
						}else{
							var element=this._getElement(
								selection[i][n],{ // 
									frame:settings.frame
								}
							);
						}
						if(element){
							if(
								layer.layerType=='mask' && colorX
							){
								filtered.appendChild(element);
							}else{
								layerXML.appendChild(element);
							};
						}
					}
					/*
					 * Masked layers are grouped together and inserted after
					 * the mask.
					 */
					if(isMasked){  // 
						masked.push(layerXML);
					}else if(layerXML){
						xml.appendChild(layerXML);
						if(layer.layerType=='mask'){
							var mg=<g id={this._uniqueID('masked')} mask={"url(#"+id+")"}/>;
							for(var m=0;m<masked.length;m++){
								mg.appendChild(masked[m]);
							}
							xml.appendChild(mg);
							masked.clear();
						}
					}
					if(layer.visible!=lVisible){layer.visible=lVisible;}
					if(layer.locked!=lLocked){layer.locked=lLocked;}
				}
			}
			/*
			 *  If this is a temporary scene, delete it and return to the original.
			 */
			if(originalScene!==undefined){
				var timelines=ext.timelines;
				ext.doc.deleteScene();
				for(i=0;i<ext.timelines.length;i++){
					if(timelines[i].name==originalScene){
						ext.doc.editScene(i);
						break;	
					}
				}
			}
			var result;
			if(instanceXML){ // set the viewBox
				if(
					settings.isRoot && 
					this.clipToScalingGrid &&
					settings.libraryItem
				){
					boundingBox=settings.libraryItem.scalingGridRect;
				}else{
					boundingBox=settings.selection.boundingBox;
				}				
				instanceXML['@width']=String(boundingBox.right-boundingBox.left);
				instanceXML['@height']=String(boundingBox.bottom-boundingBox.top);
				instanceXML['@x']=String(boundingBox.left);
				instanceXML['@y']=String(boundingBox.top);
				xml['@viewBox']=(
					String(boundingBox.left)+' '+
					String(boundingBox.top)+' '+
					String(boundingBox.right-boundingBox.left)+' '+
					String(boundingBox.bottom-boundingBox.top)
				);
				this.xml.defs.appendChild(xml);
				result=instanceXML;
			}else{
				result=xml;
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return result;
		},
		/**
		 * Retrieves the svg data for a symbol instance.
		 * @parameter {extensible.SymbolInstance} instance
		 * @parameter {Object} options
		 * @private
		 */
		_getSymbolInstance:function(instance,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getSymbolInstance()');	
			}
			var settings=new ext.Object({
				frame:0,
				matrix:new ext.Matrix(),
				colorTransform:null,
				libraryItem:instance.libraryItem
			});
			settings.extend(options);
			settings.matrix=instance.matrix.concat(settings.matrix);
			var timeline=instance.timeline;
			settings.frame=instance.getCurrentFrame(settings.frame);
			var xml=this._getTimeline(instance.timeline,settings);
			var filterID=this._getFilters(instance,options);
			if(filterID && this.xml.defs.filter.(@id==filterID).length()){
				xml['@filter']='url(#'+filterID+')';
			}
			if(ext.log){
				ext.log.pauseTimer(timer);
			}
			return xml;
		},
		_getFilters:function(element,options,defs){
			defs=defs||this.xml.defs;
			var settings=new ext.Object({
				frame:0,
				color:undefined,
				boundingBox:undefined
			});
			settings.extend(options);
			var filterID,filter;
			var filters=(
				element?
				element.getFilters().filter(
					function(element,index,array){
						return element.enabled;
					}
				):[]
			);
			var color=(
				settings.color ?
				new ext.Color(settings.color) : (
					element?
					new ext.Color(element):
					undefined
				)
			);
			if(
				(
					color &&
					( !color.amount.is([0,0,0,0]) || !color.percent.is([100,100,100,100]) )
				) || filters.length
			){
				var src="SourceGraphic";
				filterID=this._uniqueID('filter');
				filter=new XML('<filter id="'+filterID+'" />');			
				var boundingBox=(
					settings.boundingBox ||
					(
						element?
						element.objectSpaceBounds:
						null
					)
				);
				if(
					element &&
					!boundingBox && 
					element.getObjectSpaceBounds
				){
					boundingBox=element.getObjectSpaceBounds({
						includeGuides:this.includeGuides,
						includeHiddenLayers:this.includeHiddenLayers,
						frame:(
							element.getCurrentFrame?
							element.getCurrentFrame(settings.frame):
							settings.frame
						)
					});
				}
				var leftMargin,rightMargin,topMargin,bottomMargin;
				leftMargin=rightMargin=topMargin=bottomMargin=0;
				var filterCount={
					adjustColorFilter:0,
					bevelFilter:0,
					blurFilter:0,
					dropShadowFilter:0,
					glowFilter:0,
					gradientBevelFilter:0,
					gradientGlowFilter:0,
				};
				var adj={r:0.2125,g:0.7154,b:0.0721};
				var adjEq={r:.33333,b:.33333,g:.33333};
				var adjInv={r:0.7875,g:0.2846,b:0.9279};
				for(var i=0;i<filters.length;i++){
					var f=filters[i];
					var prefix=(
						f.name.replace(/Filter$/,'')+String(filterCount[f.name])+'_'
					);
					filterCount[f.name]+=1;
					switch(f.name){
						case "adjustColorFilter":
							/*
							 * For contrast & saturation with values > 0, reproducing the *exact* same result is not always possible
							 * because color-rendering behaviors for out of gamut colors differ, and although SVG specifications
							 * provide for color profiles, most svg implementations do not use them.
							 */
							if(f.brightness!=0){
								var brightness=f.brightness/100;
								var feComponentTransfer_brightness=<feComponentTransfer id={this._uniqueID('feComponentTransfer_brightness')} />;
								var feFuncR=<feFuncR id={this._uniqueID('feFuncR')} />;
								var feFuncG=<feFuncG id={this._uniqueID('feFuncG')} />;
								var feFuncB=<feFuncB id={this._uniqueID('feFuncB')} />;
								feFuncR.@type=feFuncG.@type=feFuncB.@type="linear";
								feFuncR.@slope=feFuncG.@slope=feFuncB.@slope=(
									(
										1+
										Math.max(brightness*2,0)+
										Math.min(brightness*.5,0)
									)
								);
								feFuncR.@intercept=feFuncG.@intercept=feFuncB.@intercept=(
									brightness/8
								);
								feComponentTransfer_brightness.appendChild(feFuncR);
								feComponentTransfer_brightness.appendChild(feFuncG);
								feComponentTransfer_brightness.appendChild(feFuncB);
								feComponentTransfer_brightness['@in']=src;
								feComponentTransfer_brightness.@result=src=prefix+'feComponentTransfer_brightness';
								filter.appendChild(feComponentTransfer_brightness);
							}
							if(f.contrast!=0){
								var contrast=f.contrast/100;
								var feComponentTransfer_contrast=<feComponentTransfer id={this._uniqueID('feComponentTransfer_contrast')} />;
								var feFuncR=<feFuncR id={this._uniqueID('feFuncR')} />;
								var feFuncG=<feFuncG id={this._uniqueID('feFuncG')} />;
								var feFuncB=<feFuncB id={this._uniqueID('feFuncB')} />;
								feFuncR.@type=feFuncG.@type=feFuncB.@type="linear";
								feFuncR.@slope=feFuncG.@slope=feFuncB.@slope=(
									(
										1+
										Math.max(contrast*4,0)+
										Math.min(contrast,0)
									)
								);
								feFuncR.@intercept=feFuncG.@intercept=feFuncB.@intercept=(
									-Math.min(contrast/16,0)
									-Math.max(contrast/8,0)
								);
								feComponentTransfer_contrast.appendChild(feFuncR);
								feComponentTransfer_contrast.appendChild(feFuncG);
								feComponentTransfer_contrast.appendChild(feFuncB);
								feComponentTransfer_contrast['@in']=src;
								feComponentTransfer_contrast.@result=src=prefix+'feComponentTransfer_contrast';
								filter.appendChild(feComponentTransfer_contrast);
							}
							if(f.saturation!=0){
								var feColorMatrix2=<feColorMatrix id={this._uniqueID('feColorMatrix')} />;
								feColorMatrix2.@type='matrix';
								var s=f.saturation/100+1;
								feColorMatrix2.@values=[
									adjEq.r+(1-adjEq.r)*s,	adjEq.g-adjEq.g*s,	adjEq.b-adjEq.b*s,0,0,
									adjEq.r-adjEq.r*s,	adjEq.g+(1-adjEq.g)*s,	adjEq.b-adjEq.b*s,0,0,
									adjEq.r-adjEq.r*s,	adjEq.g-adjEq.g*s,	adjEq.b+(1-adjEq.b)*s,0,0,
									0,	0,	0,	1,	0
								].join(' ');
								feColorMatrix2['@in']=src;
								feColorMatrix2.@result=src=prefix+'feColorMatrix2';
								filter.appendChild(feColorMatrix2);
							}
							if(f.hue!=0){
								var feColorMatrix=<feColorMatrix id={this._uniqueID('feColorMatrix')} />;
								feColorMatrix.@type='hueRotate';
								feColorMatrix.@values=f.hue;
								feColorMatrix['@in']=src;
								feColorMatrix.@result=src=prefix+'feColorMatrix';
								filter.appendChild(feColorMatrix);
							}
							break;
						case "bevelFilter":
							break;
						case "blurFilter":
							if(
								f.blurX!=0 ||
								f.blurY!=0
							){
								var sx=element.matrix.scaleX;
								var sy=element.matrix.scaleY;
								var feGaussianBlur=<feGaussianBlur id={this._uniqueID('feGaussianBlur')} />;
								feGaussianBlur.@stdDeviation=[f.blurX*2/sx,f.blurY*2/sy].join(' ');
								feGaussianBlur['@in']=src;
								feGaussianBlur.@result=src=prefix+'feGaussianBlur';
								filter.appendChild(feGaussianBlur);
								leftMargin+=f.blurX*4/sx;
								rightMargin+=f.blurX*4/sx;
								topMargin+=f.blurY*4/sy;
								bottomMargin+=f.blurY*4/sy;
							}
							break;
						case "dropShadowFilter":
							break;
						case "glowFilter":
							break;
						case "gradientBevelFilter":
							break;
						case "gradientGlowFilter":
							break;
					}
				}
				filter.@filterUnits="objectBoundingBox";
				if(boundingBox){
					var width=(1+(leftMargin+rightMargin)/(boundingBox.right-boundingBox.left))*100;
					var height=(1+(topMargin+bottomMargin)/(boundingBox.bottom-boundingBox.top))*100;
					var x=(-leftMargin/(boundingBox.right-boundingBox.left))*100;
					var y=(-topMargin/(boundingBox.bottom-boundingBox.top))*100;
					filter.@width=String(width)+'%';
					filter.@height=String(height)+'%';
					filter.@x=String(x)+'%';
					filter.@y=String(y)+'%';
				}else{
					filter.@width='120%';
					filter.@height='120%';
					filter.@x='-10%';
					filter.@y='-10%';
				}
				if( ( element?element.colorMode!='none':false ) || settings.color ){
					if( // colorMode "tint"
						color.percent[0]==color.percent[1]==color.percent[2] && 
						color.percent[3]==100 &&
						color.amount[3]==0 &&
						false
					){
						/*
						var tintSrc=src;
						var tintOpacity=1-(color.percent[0]/100);
						var tintColor=new ext.Color(color);
						var tintColor.percent=[100,100,100,100];
						var feFlood=<feFlood id={this._uniqueID('feFlood')} />;
						feFlood['@flood-color']=tintColor.hex;
						feFlood['@flood-opacity']=tintOpacity;
						feColorMatrix['@result']=src="tint_feFlood";
						filter.appendChild(feFlood);
						var feComposite=<feComposite id={this._uniqueID('feComposite')} />;
						feComposite.@operator=atop;
						feComposite.@in=tintSrc;
						feComposite.@in2=src;
						feComposite.@result='tint_feComposite';
						*/
					}else{
						if(!color.percent.is([100,100,100,100])){
							feColorMatrix=<feColorMatrix id={this._uniqueID('feColorMatrix')} />;
							feColorMatrix.@type="matrix";
							feColorMatrix['@in']=src;
							feColorMatrix.@values=[
								color.percent[0]/100,0,0,0,0,
								0,color.percent[1]/100,0,0,0,
								0,0,color.percent[2]/100,0,0,
								0,0,0,color.percent[3]/100,0
							].join(' ');
							feColorMatrix['@result']=src="colorEffect_percent";
							filter.appendChild(feColorMatrix);
						}
						if(!color.amount.is([0,0,0,0])){
							var feComponentTransfer=<feComponentTransfer id={this._uniqueID('feComponentTransfer')} />;
							feComponentTransfer['@in']=src;
							feComponentTransfer.@result=src='colorEffect_amount';
							var feFuncR=<feFuncR id={this._uniqueID('feFuncR')} />;
							var feFuncG=<feFuncG id={this._uniqueID('feFuncG')} />;
							var feFuncB=<feFuncB id={this._uniqueID('feFuncB')} />;
							var feFuncA=<feFuncA id={this._uniqueID('feFuncA')} />;
							feFuncR.@type=feFuncG.@type=feFuncB.@type=feFuncA.@type="linear";
							feFuncR.@slope=feFuncG.@slope=feFuncB.@slope=feFuncA.@slope=1;
							feFuncR.@intercept=color.amount[0]/255;
							feFuncG.@intercept=color.amount[1]/255;
							feFuncB.@intercept=color.amount[2]/255;
							feFuncA.@intercept=color.amount[3]/255;
							feComponentTransfer.appendChild(feFuncR);
							feComponentTransfer.appendChild(feFuncG);
							feComponentTransfer.appendChild(feFuncB);
							feComponentTransfer.appendChild(feFuncA);
							filter.appendChild(feComponentTransfer);
						}
					}
				}
			}
			if(filter && filterID && filter.*.length()){
				defs.appendChild(filter);
				return filterID;
			}
		},
		_getBitmapInstance:function(bitmapInstance,options){
			var item=bitmapInstance.libraryItem;
			var bitmapURI=this._getBitmapItem(item);
			var xml=<image overflow='visible' id={this._uniqueID(item.name.basename.stripExtension())} />;
			xml['@xlink-href']=bitmapURI;
			var bits=bitmapInstance.getBits();
			xml.@height=bitmapInstance.vPixels;
			xml.@width=bitmapInstance.hPixels;
			xml.@transform=this._getMatrix(bitmapInstance.matrix);
			return xml;
		},
		_getBitmapItem:function(item){
			var bitmapURI=this._bitmaps[item.name];
			if(!bitmapURI){
				if(this.timelines.length==1 && (this.timelines[0].frames.length==1 || this.animated)){
					bitmapURI=this.file.dir+'/'+item.name.basename;
				}else{
					bitmapURI=this.file+'/'+item.name;
					if(
						FLfile.exists(this.file) &&
						FLfile.getAttributes(this.file).indexOf("D")<0
					){
						FLfile.remove(this.file);
					}
					if(!FLfile.exists(this.file)){
						FLfile.createFolder(this.file);
					}
				}
				var ext=item.sourceFilePath.extension;
				var re=new RegExp('\.'+ext+'$');
				if(!re.test(bitmapURI)){
					bitmapURI+='.'+ext;
				}
				var success,xml;
				if(item.sourceFileExists && item.sourceFileIsCurrent){
					if(!item.sourceFilePath==bitmapURI){
						if(FLfile.exists(bitmapURI)){
							FLfile.remove(bitmapURI);
						}
						success=FLfile.copy(item.sourceFilePath,bitmapURI);
						if(!success){
							FLfile.write(bitmapURI,FLfile.read(item.sourceFilePath));
						}
					}
				}else if(FLfile.exists(bitmapURI)){
					var uniqueFileName=bitmapURI.uniqueFileName;
					item.exportToFile(uniqueFileName);
					var compareStr=FLfile.read(bitmapURI);
					if(FLfile.read(uniqueFileName)==FLfile.read(bitmapURI)){
						FLfile.remove(uniqueFileName);
					}else{
						bitmapURI=uniqueFileName;
					}
				}else{
					item.exportToFile(bitmapURI);	
				}
				bitmapURI=bitmapURI.relativeTo(this.file.dir);
				this._bitmaps[item.name]=bitmapURI;
			}
			return bitmapURI;
		},
		/**
		 * Retrieves svg data for a Shape Element.
		 * @parameter {extensible.Shape} shape
		 * @parameter {Object} options
		 * @parameter {Matrix} options.matrix
		 * @parameter {extensible.Color} options.colorTransform
		 * @parameter {Number} frame
		 * @private
		 * 
		 */
		_getShape:function(shape,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getShape() >> 1');	
			}
			var settings=new ext.Object({
				matrix:new ext.Matrix(),
				colorTransform:null,
				frame:null
			});
			settings.extend(options);
			var matrix=shape.matrix;
			var descendantMatrix=new ext.Matrix();
			var pathMatrix=null;
			var layerLocked=shape.layer.locked;
			var id;
			if( shape.isRectangleObject || shape.isOvalObject ){ // ! important
				id=(
					shape.isRectangleObject?
					this._uniqueID('rectangleObject'):
					this._uniqueID('ovalObject')
				);
				shape.setTransformationPoint({x:0.0,y:0.0});
				var origin=new ext.Point({
					x:(shape.objectSpaceBounds.left-shape.objectSpaceBounds.right)/2,
					y:(shape.objectSpaceBounds.top-shape.objectSpaceBounds.bottom)/2
				}).transform(matrix);
				matrix.tx=origin.x;
				matrix.ty=origin.y;
				matrix=matrix.concat(settings.matrix);
				if(shape.objectSpaceBounds.left!=0 || shape.objectSpaceBounds.top!=0){
					pathMatrix=new ext.Matrix({
						tx:-shape.objectSpaceBounds.left,
						ty:-shape.objectSpaceBounds.top
					});
				}
			}else if(shape.isDrawingObject){
				id=this._uniqueID('drawingObject');
				matrix=matrix.concat(settings.matrix);
			}else if(shape.isGroup){
				id=this._uniqueID('group');
				descendantMatrix=matrix.invert();
				var c=shape.center;
				var tr=shape.getTransformationPoint();
				var osb=shape.objectSpaceBounds;
				osb.left=Math.min(osb.left,c.x-tr.x);
				osb.right=Math.max(osb.right,c.x-tr.x);
				osb.top=Math.min(osb.top,c.y-tr.y);
				osb.bottom=Math.max(osb.bottom,c.y-tr.y);
				pathMatrix=new ext.Matrix({
					tx:(
						osb.left+
						osb.right
					)/2.0,
					ty:(
						osb.top+
						osb.bottom
					)/2.0
				});
				pathMatrix=pathMatrix.invert();
				matrix=matrix.concat(settings.matrix);
			}else{
				id=this._uniqueID('shape');
				matrix.tx=shape.left;
				matrix.ty=shape.top;
				matrix=matrix.concat(settings.matrix);
				if(
					shape.objectSpaceBounds &&
					(
						shape.objectSpaceBounds.left!=0 ||
						shape.objectSpaceBounds.top!=0
					)
				){
					pathMatrix=new ext.Matrix({tx:shape.objectSpaceBounds.left,ty:shape.objectSpaceBounds.top});
					pathMatrix=pathMatrix.invert();
				}
			}
			var contours=shape.contours;
			if(!(contours && contours.length) && !shape.isGroup){
				return;	
			}
			var svgArray=new ext.Array();
			var filled=new ext.Array();
			var tobeCut=null;
			var ii;
			var validContours=new ext.Array([]);
			
			for(i=0;i<contours.length;i++){
				var s=this._getContour(contours[i],{
					colorTransform:settings.colorTransform,
					matrix:pathMatrix
				});
				if(s){
					validContours.push(contours[i]);
					svgArray.push(s);
					if(contours[i].orientation!=0){
						var oppositeFill=contours[i].oppositeFill;
						var fill=contours[i].fill;
						if(
							filled.length>0 && !(
								oppositeFill.style=='noFill' &&
								fill.style=='noFill'
							)
						){
							for(var n=filled.length-1;n>-1;n-=1){
								var insideOut=fill.is(validContours[filled[n]].fill);
								var sameDir=(
									contours[i].orientation<0
									//|| contours[i].getControlPoints( {curveDegree:this.curveDegree} ).isReversed
								)==(
									validContours[filled[n]].orientation<0
									//|| validContours[filled[n]].getControlPoints( {curveDegree:this.curveDegree} ).isReversed
								);
								if(
									svgArray[filled[n]].path.length()
									&& svgArray[filled[n]].path[0].@stroke.length()==0 
									&& (
										oppositeFill.is(validContours[filled[n]].fill) 
										//|| (oppositeFill.style=='noFill' && fill.style=='noFill')
										|| insideOut
									)
								){
									var cutID=String(svgArray[filled[n]].path[0]['@id']);
									var rev=( sameDir && !insideOut ) || ( insideOut && !sameDir);
									s=this._getContour(contours[i],{
										colorTransform:settings.colorTransform,
										reversed: rev
									});
									if(s){
										var so=this._getContour(contours[i],{
											colorTransform:settings.colorTransform,
											reversed: !rev
										});
										for(var p=0;p<s.path.length() && p<so.path.length();p++){
											var pStr=String(s.path[p]['@d']).trim();
											if(pStr[pStr.length-1]!=='z'){
												pStr+='z';
											}
											var pA=/^[^Zz]*[Zz]?/.exec(pStr)[0];
											var pAO=null;
											var pStrO=String(so.path[p]['@d']).trim();
											if(pStrO[pStrO.length-1]!=='z'){
												pStrO+='z';
											}
											pAO=/^[^Zz]*[Zz]?/.exec(pStrO)[0];
											var fs=String(svgArray[filled[n]].path[0]['@d']).match(/^[^Zz]*[Zz]?/)[0];
											if(fs!==pAO && fs!==pA){
												svgArray[filled[n]].path[0]['@d']+=pA;
											}
										}
										break;
									}
								}
							}
							if(
								fill.style=='noFill' || (
									insideOut && oppositeFill.style=='noFill'
								)
							){
								ii=0;
								var sa=svgArray[svgArray.length-1].copy();
								for each(var n in sa.*){
									if(n['@stroke'].length()==0){
										delete svgArray[svgArray.length-1].path[ii];
									}
									ii+=1;
								}
								delete sa;
							}
						}
						if(contours[i].fill.style!='noFill'){
							filled.push(svgArray.length-1);
						}
					}
				}
			}			
			var svg=new XML('<g id="'+id+'"/>');
			svg['@transform']=this._getMatrix(matrix);
			for(var i=0;i<svgArray.length;i++){
				if(svgArray[i].path.length()){ // eliminate duplicate paths
					ii=0; 
					for each(n in svgArray[i].path){
						if(
							(!n['@stroke'].length() || String(n['@stroke'][0])=='none' || String(n['@stroke'][0])=='') && 
							(!n['@fill'].length() || String(n['@fill'][0])=='none' ||  String(n['@fill'][0])=='')
						){
							delete svgArray[i].path[ii];
						}else if(n.localName()=='path' && n['@stroke'].length()){
							var cs0=String(n['@d']).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
							var ca0=cs0.split(' ');
							if(ca0[ca0.length-1]==ca0[0]){
								ca0.pop();
								cs0=ca0.join(' ');
							}
							var index=0;
							for(s in svg){
								if(svg[s].localName()=='path' && svg[s]['@stroke'].length()){
									var cs1=String(svg[s]['@d']).replace(/[^\d\.\,]/g,' ').replace(/([^\s])(\s\s*?)([^\s])/g,'$1 $3').trim();
									var ca1=cs1.split(' ');
									if(ca1[ca1.length-1]==ca1[0]){
										ca1.pop();
										cs1=ca1.join(' ');
									}
									if(ca1[0]!=ca0[0] && ca1[0]!=ca0[ca0.length-1]){
										ca1=cs1.split(ca0[0]+' '+ca0[1]+' '+ca0[2]);
										cs1=ca0[0]+' '+ca0[1]+' '+ca0[2]+' '+cs1[1].trim()+' '+cs1[0].trim();
										ca1=cs1.split(' ');
									}
									if(ca0[0]==ca1[ca1.length-1]){
										ca1=ca1.reverse()
										cs1=ca1.join(' ');
									}
									if(cs0==cs1){
										delete svg[s];
									}
								}
							}
						}
						ii+=1;
					}
					for each(var s in svgArray[i].*){
						svg.appendChild(s);
					}
				}
			}
			if(
				shape.isGroup && 
				!shape.isDrawingObject && 
				!shape.isRectangleObject &&
				!shape.isOvalObject
			){
				var g=shape.members;
				for(i=0;i<g.length;i++){
					var e=this._getElement(
						g[i],
						{
							colorTransform:settings.colorTransform,
							matrix:descendantMatrix,
							frame:settings.frame
						}
					);
					if(e){svg.appendChild(e);}
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return svg;		
		},
		_getContour:function(contour,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getContour()');	
			}
			var settings=new ext.Object({
				matrix:null,
				reversed:false,
				colorTransform:null
			});
			settings.extend(options);
			var controlPoints=contour.getControlPoints({
				curveDegree:this.curveDegree,
				reversed:settings.reversed
			});
			if(!controlPoints || controlPoints.length==0){
				return;
			}
			var fills=new ext.Array();
			var paths=new ext.Array();
			var interior=false;
			var xform='';
			if(settings.matrix){
				xform='transform="'+this._getMatrix(settings.matrix)+'" ';
			}	
			var id,idString;
			if(contour.interior){//Construct a curve for the enclosed shape if present.
				interior=true;
				var fillString='none';
				var opacityString='1';
				var fill=this._getFill(contour.fill,{
					shape:contour.shape
				});
				if(fill){
					if(fill.name()=='solidColor'){
						fillString=String(fill['@solid-color']);
						opacityString=String(fill['@solid-opacity']);
					}else{
						this.xml.defs.appendChild(fill)
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
				var cdata;
				cdata=this._getCurve(controlPoints,contour.orientation);
				id=this._uniqueID('path');
				idString='id="'+id+'" ';
				paths.push('<path  '+idString+xform+'fill="'+fillString+'" fill-opacity="'+opacityString+'" d="'+cdata+'"/>\n');
			}
			var hasStroke=false;
			if(controlPoints.length>0 && !settings.reversed){
				//Create a contour for each length of contiguous edges w/ the same stroke attributes. 
				//Skipped for settings.reversed, which is only used for creating hollows.
				var cp=new ext.Array([]);
				var stroke=null;
				var firstEdge=controlPoints[0][0].edge;
				if(firstEdge.stroke && firstEdge.stroke.style!='noStroke'){
					hasStroke=true;
					cp.push(controlPoints[0]);
					stroke=firstEdge.stroke;
				}
				for(i=1;i<controlPoints.length;i++){
					var edge=controlPoints[i][0].edge;
					if(edge.stroke && edge.stroke.style!='noStroke'){
						if(stroke!==null && edge.stroke.is(stroke)){
							cp.push(controlPoints[i]);
						}else{
							if(stroke && cp.length>0){
								id=this._uniqueID('path');
								idString='id="'+id+'" ';
								paths.push(
									'<path '+
									idString+
									xform+
									'fill="none" '+
									this._getStroke(stroke,{shape:contour.shape})+
									'd="'+this._getCurve(cp,contour.orientation)+'" '+
									'/>\n'
								);
							}
							stroke=edge.stroke;
							cp=new ext.Array([controlPoints[i]]);
						}
					}else{
						if(stroke && cp.length>0){
							id=this._uniqueID('path');
							idString='id="'+id+'" ';
							paths.push(
								'<path '+
								idString+
								xform+
								'fill="none" '+
								this._getStroke(stroke)+
								'd="'+this._getCurve(cp,contour.orientation)+'" '+
								'/>\n'
							);
						}
						stroke=null;
						cp.clear();
					}
				}
				if(stroke && cp.length>0){//create the last stroke
					if(
						firstEdge.stroke && firstEdge.stroke.style!='noStroke' && stroke.is(firstEdge.stroke)
						&& ((interior && paths.length>1) || (!interior && paths.length>0))
					){//if the stroke on the beginning of the contour matches that at the end, connect them
						var pathID=interior?1:0;
						var x=new XML(paths[pathID]);
						var cd1=this._getCurve(cp,contour.orientation).trim();
						var cd2=x['@d'].trim();
						var cd1Points=cd1.split(' ');
						var cd2Points=cd2.split(' ');
						var cd1ep=cd1Points.pop();
						var cd2sp=cd2Points.shift();
						if(cd1ep.replace(/[A-Za-z]/g,'')==cd2sp.replace(/[A-Za-z]/g,'')){
							x['@d']=cd1Points.join(' ')+' '+cd1ep+' '+cd2Points.join(' ');
						}else{
							x['@d']=cd1+' '+cd2;
						}
						if(cd1Points.shift().replace(/[A-Za-z]/g,'')==cd2Points.pop().replace(/[A-Za-z]/g,'')){
							x['@d']+='z';
						}
						paths[pathID]=x.toXMLString()+'\n';
					}else{
						id=this._uniqueID('path');
						idString='id="'+id+'" ';
						paths.push(
							'<path '+
							idString+
							xform+
							'fill="none" '+
							this._getStroke(stroke)+
							'd="'+this._getCurve(cp,(contour.orientation && paths.length<2))+'" '+
							'/>\n'
						);
					}
				}
			}
			var xml;
			id=this._uniqueID('shape');
			xml=new XML('<g id="'+id+'"/>');
			for(var i=0;i<paths.length;i++){
				xml.appendChild(new XML(paths[i]));
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return(xml);
		},
		/**
		 * Build a curve string from an array of arrays of points.
		 * @param {Array} controlPoints
		 * @private {Boolean} close
		 */
		_getCurve:function(controlPoints,close){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getCurve()');	
			}
			close=close!==undefined?close:true;
			if(controlPoints.length==0){
				return;	
			}
			var degPrefix=['M','L','Q','C'];
			var deg=controlPoints[0].length-1;
			var curveString=[degPrefix[0]+controlPoints[0][0].x+","+controlPoints[0][0].y+" "];
			if(deg>0){
				curveString.push(degPrefix[deg]+controlPoints[0][1].x+","+controlPoints[0][1].y+" ");
			}
			if(deg>1){
				curveString.push(controlPoints[0][2].x+","+controlPoints[0][2].y+" ");
			}
			if(deg>2){
				curveString.push(controlPoints[0][3].x+","+controlPoints[0][3].y+" ");
			}
			for(var i=1;i<controlPoints.length;i++){
				var prevdeg=deg;
				deg=controlPoints[i].length-1;
				var m=false;
				if(!controlPoints[i][0].is(controlPoints[i-1][prevdeg])){
					m=true;
					curveString.push(
						"L"+String(controlPoints[i][0].x)+","+
						String(controlPoints[i][0].y)+" "
					);
				}
				if(deg!=prevdeg || m){curveString.push(degPrefix[deg]);}
				for(var n=1;n<=deg;n++){
					curveString.push(controlPoints[i][n].x+","+controlPoints[i][n].y+(n==deg?"":" "));
				}
				if(
					close &&
					controlPoints[i][deg].is(controlPoints[0][0])
				){
					curveString.push('z ');
					break;
				}else{
					curveString.push(" ");
				}
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return curveString.join('');
		},
		/**
		 * Returns a paint server for the specified fill.
		 * @param {extensible.Fill} fillObj
		 * @private {Object} options
		 */
		_getFill:function(fillObj,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getFill()');	
			}
			var settings=new ext.Object({
				shape:undefined,
				gradientUnits:'userSpaceOnUse' // objectBoundingBox, userSpaceOnUse
			});
			settings.extend(options);
			if(typeof fillObj=='string'){
				fillObj=new ext.Fill(fillObj);
			}else if(fillObj.style=='noFill'){
				if(ext.log){ext.log.pauseTimer(timer);}
				return;
			}
			id=this._uniqueID(fillObj.style);
			var xml,defaultMeasurement;
			var shape=settings.shape;
			var matrix=fillObj.matrix;
			switch(fillObj.style){
				case 'linearGradient':
					defaultMeasurement=this.DEFAULT_GRADIENT_LENGTH;
				case 'radialGradient':
					defaultMeasurement=defaultMeasurement||this.DEFAULT_GRADIENT_RADIUS;
					if(!shape){
						if(ext.log){ext.log.pauseTimer(timer);}
						return;
					}
					xml=new XML('<'+fillObj.style+'/>');
					xml['@gradientUnits']=settings.gradientUnits;
					xml['@color-interpolation']=fillObj.linearRGB?'linearRGB':'sRGB';
					switch(fillObj.overflow){
						case 'extend':
							xml['@spreadMethod']='pad';
							break;
						case 'reflect':
							xml['@spreadMethod']='reflect';
							break;
						case 'repeat':
							xml['@spreadMethod']='repeat';
							break;
					}
					for(var i=0;i<fillObj.colorArray.length;i++){
						var stop=new XML('<stop/>');
						var c=new ext.Color(fillObj.colorArray[i]);
						stop['@stop-color']=c.hex;
						stop['@stop-opacity']=c.opacity;
						if(i<fillObj.posArray.length){
							stop['@offset']=String(Math.roundTo((fillObj.posArray[i]/255.0),this.decimalPointPrecision+2));
						}
						xml.appendChild(stop);
					}
					var width=shape.objectSpaceBounds.right-shape.objectSpaceBounds.left;
					var height=shape.objectSpaceBounds.bottom-shape.objectSpaceBounds.top;
					var p0;
					var p1=new ext.Point({x:0,y:0});
					var p2;
					var unitID='';
					if(settings.gradientUnits=='objectBoundingBox'){
						unitID='%';
						p2=new ext.Point({
							x:((defaultMeasurement)/width)*100,
							y:0
						});
					}else{
						p2=new ext.Point({
							x:defaultMeasurement,
							y:0
						});
					}
					p0=p2.reflect(p1);
					switch(fillObj.style){
						case 'radialGradient':
							var mx=new ext.Matrix({
								a:matrix.scaleX,
								b:0,
								c:0,
								d:matrix.scaleX,
								tx:matrix.tx,
								ty:matrix.ty
							});
							p0=p0.transform(mx);
							p1=p1.transform(mx);
							p2=p2.transform(mx);
							matrix=mx.invert().concat(matrix);
							var bias=(fillObj.focalPoint+255)/510;
							var fp=p0.midPoint(p2,bias);
							xml['@r']=String(p1.distanceTo(p2))+unitID;
							xml['@cx']=String(p1.x)+unitID;
							xml['@cy']=String(p1.y)+unitID;
							xml['@fx']=String(fp.x)+unitID;
							xml['@fy']=String(fp.y)+unitID;
							xml['@gradientTransform']=this._getMatrix(matrix);
							break;
						case 'linearGradient':
							p0=p0.transform(matrix);
							p1=p1.transform(matrix);
							p2=p2.transform(matrix);
							xml['@x1']=String(p0.x)+unitID;
							xml['@y1']=String(p0.y)+unitID;
							xml['@x2']=String(p2.x)+unitID;
							xml['@y2']=String(p2.y)+unitID;
							break;
					}
					break;
				case 'bitmap':
					xml=<pattern id={this._uniqueID('pattern')} />;
					var image=<image id={this._uniqueID(fillObj.bitmapPath.basename)} />;
					xml.@patternUnits=xml.@patternContentUnits='userSpaceOnUse';
					var item=ext.lib.getItem(fillObj.bitmapPath);
					var bitmapURI=this._getBitmapItem(item);
					image['@xlink-href']=bitmapURI;
					xml.@width=image.@width=item.width;
					xml.@height=image.@height=item.height;
					xml.@viewBox='0 0 '+String(xml.@width)+' '+String(xml.@height);
					var fMatrix=new ext.Matrix(fillObj.matrix);
					fMatrix.a*=this.DEFAULT_BITMAP_SCALE;
					fMatrix.b*=this.DEFAULT_BITMAP_SCALE;
					fMatrix.c*=this.DEFAULT_BITMAP_SCALE;
					fMatrix.d*=this.DEFAULT_BITMAP_SCALE;
					xml.@patternTransform=this._getMatrix(fMatrix);
					if(this.convertPatternsToSymbols){
						var symbol=<symbol id={this._uniqueID(fillObj.bitmapPath.basename+'_symbol')} />;
						symbol.@viewBox=String(xml.@viewBox);
						var use=<use id={this._uniqueID(fillObj.bitmapPath.basename+'_use')} />;
						use.@width=String(image.@width);
						use.@height=String(image.@height);
						use.@x=use.@y=0;
						use['@xlink-href']='#'+String(symbol.@id);
						use.@externalResourcesRequired='true';
						symbol.appendChild(image);
						xml.appendChild(symbol);
						xml.appendChild(use);
					}else{
						xml.appendChild(image);
					}
					break;
				case 'solid':
					var color=new ext.Color(fillObj.color);
					xml=new XML('<solidColor/>');
					xml['@solid-color']=color.hex;
					xml['@solid-opacity']=color.opacity;
					break;
			}
			xml['@id']=id;
			if(ext.log){ext.log.pauseTimer(timer);}
			return xml;
		},
		/**
		 * Returns stroke attribute string.
		 * If the stroke has a shapeFill, a paint server for the specified fill
		 * is inserted under this.xml.defs.
		 * @param {extensible.Fill} fillObj
		 * @param {Object} options Options object, passed on to _getFill() if 
		 * a shapeFill is present.
		 * @return {String} Returns stroke attributes.
		 * @private
		 */
		_getStroke:function(stroke,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getStroke()');	
			}
			var svg=[];
			var fillString,opacityString;
			if(stroke.shapeFill && stroke.shapeFill!='noFill'){
				var fill=this._getFill(
					stroke.shapeFill,
					options
				);
				if(fill){
					if(fill.name()=='solidColor'){
						fillString=String(fill['@solid-color']);
						opacityString=String(fill['@solid-opacity']);
					}else{
						this.xml.defs.appendChild(fill)
						fillString='url(#'+String(fill['@id'])+')';
					}
				}
			}else{
				var color=new ext.Color(stroke.color);
				fillString=color.hex;
				if(color.opacity<1){
					opacityString=String(color.opacity);
				}
			}
			svg.push('stroke="'+fillString+'" ');
			if(opacityString){
				svg.push('stroke-opacity="'+opacityString+'"');
			}
			svg.push(
				'stroke-width="'+stroke.thickness+'"',
				'stroke-linecap="'+(stroke.capType=='none'?'round':stroke.capType)+'"',
				'stroke-linejoin="'+stroke.joinType+'"'
			);
			if(stroke.joinType=='miter'){
				svg.push('stroke-miterlimit="'+stroke.miterLimit+'"');
			}
			if(stroke.scaleType=='none'){
				svg.push('vector-effect="non-scaling-stroke"');
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return svg.join(' ')+' ';
		},
		_getText:function(element,options){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._getText()');	
			}
			var settings=new ext.Object({});
			settings.extend(options);
			var xml;
			if(this.convertTextToOutlines){
				var timeline=element.timeline;
				if(element instanceof ext.Text){
					if(
						!element.$.length
					){
						return;	
					}
					var	textWidth=element.$.textWidth;
					var	textHeight=element.$.textHeight;
				}
				var layer=element.layer;
				var frame=(
					settings.frame!=undefined?
					layer.frames[settings.frame]:
					element.frame
				);
				var index=element.frame.elements.expandGroups().indexOf(element);
				var matrix=element.matrix;
				var id=element.uniqueDataName(String('temporaryID_'+String(Math.floor(Math.random()*9999))));
				var pd=Math.floor(Math.random()*99999999);
				element.setPersistentData(id,'integer',pd);
				timeline.setSelectedLayers(layer.index);
				timeline.copyFrames(frame.startFrame);
				var currentTimeline=ext.timeline;
				currentTimeline.setSelectedLayers(currentTimeline.layerCount-1);
				var tempLayerIndex=currentTimeline.addNewLayer('temp','normal',false);
				currentTimeline.setSelectedLayers(tempLayerIndex);
				currentTimeline.pasteFrames(0);
				var searchElements=currentTimeline.layers[tempLayerIndex].frames[0].elements;
				var tempElement=searchElements.expandGroups()[index];
				var parentGroups=tempElement.getParentGroups();
				if(parentGroups && parentGroups.length){
					ext.sel=[parentGroups[0]];
					for(var i=0;i<searchElements.length && ext.sel.length==0;i++){
						ext.doc.exitEditMode();
						ext.sel=[parentGroups[0]];
					}
					for(var i=0;i<parentGroups.length;i++){
						ext.doc.breakApart();
					}
					ext.doc.selectNone();
				}
				searchElements=currentTimeline.layers[tempLayerIndex].frames[0].elements;
				for(var i=0;i<searchElements.length;i++){
					if(
						searchElements[i].hasPersistentData(id) &&
						searchElements[i].getPersistentData(id)==pd
					){
						tempElement=searchElements[i];
					}else{
						//for(var i=0;i<10 && ext.sel.length==0;i++){
							ext.sel=[searchElements[i]];
						//}
						//if(ext.sel.length){
							ext.doc.deleteSelection();
						//}
					}
				}
				var tempMatrix=new ext.Matrix();
				tempElement.matrix=tempMatrix;
				if(element instanceof ext.Text){
					tempElement.$.textType='static';
					tempElement.$.textHeight=textHeight;
					tempElement.$.textWidth=textWidth;
				}else{
					tempMatrix.a=(
						new ext.Point({
							x:tempElement.matrix.a,
							y:tempElement.matrix.b
						})
					).length;
					tempMatrix.d=(
						new ext.Point({
							x:tempElement.matrix.c,
							y:tempElement.matrix.d
						})
					).length;	
				}
				ext.sel=[tempElement];
				for(var i=0;i<parentGroups.length && ext.sel.length==0;i++){
					ext.doc.exitEditMode();
					ext.sel=[tempElement];
				}
				for(
					i=0;
					i<10 &&
					ext.sel.length>0 &&
					(
						ext.sel[0] instanceof ext.Text ||
						ext.sel[0] instanceof ext.TLFText
					);
					i++
				){
					try{
						ext.doc.breakApart();
					}catch(e){}
				}
				ext.doc.union();
				options.matrix=matrix.concat(tempMatrix.invert()).concat(options.matrix);
				var xml=this._getShape(currentTimeline.layers[tempLayerIndex].elements[0],options);
				currentTimeline.deleteLayer(tempLayerIndex);
				element.removePersistentData(id);
				if(ext.log){
					ext.log.pauseTimer(timer);	
				}
				return xml;
			}
			return xml;
		},
		_getMatrix:function(matrix){
			if(!(matrix instanceof ext.Matrix)){
				matrix=new ext.Matrix(matrix);
			}
			return([
				'matrix('+String(matrix.a),
				String(matrix.b),
				String(matrix.c),
				String(matrix.d),
				String(matrix.tx),
				String(matrix.ty)+')'
			].join(' '));
		},
		/**
		 * Splits the xml into multiple documents. For use when exporting multiple root timelines.
		 * @private
		 */
		_splitXML:function(inputXML){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._splitXML()');	
			}
			var documents=new ext.Array();
			var emptyXML=inputXML.copy();
			delete emptyXML.use;
			delete emptyXML.g;
			for each(var e in inputXML.use+inputXML.g){
				var xml=emptyXML.copy();
				element=e.copy();
				if(element.localName()=='use'){
					var id=String(element['@xlink-href']).slice(1);
					var symbol=xml.defs.symbol.(@id==id)[0];
					xml.@viewBox=symbol.@viewBox;
					var dimensions=(String(xml.@viewBox)).match(/[\d\-\.]*[\d\-\.]/g);
					var attrs=['x','y','width','height'];
					for(
						var i=0;
						(
							i<dimensions.length &&
							i<attrs.length
						);
						i++
					){
						xml['@'+attrs[i]]=dimensions[i];
					}
					xml['@enable-background']='new '+String(symbol.@viewBox);
					this.expandUse(element,false,this.xml.defs);
					xml.@id=id;
				}else{
					xml.@id=element.@id;	
				}
				xml.appendChild(element);
				documents.push(xml);
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			return documents;
		},
		_uniqueID:function(id,xml){
			if(ext.log){
				var timer=ext.log.startTimer('extensible.SVG._uniqueID()');	
			}
			var invalid=id.match(/[^A-Za-z\d\-\.\:]/g);
			if(invalid && invalid.length){
				for(var i=0;i<invalid.length;i++){
					id=id.replace(
						invalid[i],
						encodeURIComponent(invalid[i]).replace('%',this.MODULO_STAND_IN,'g')
					);
				}
			}		
			if(!id ||!id.length){
				id='g';
			}
			var parts=/(.*[^\d])([\d][\d]*$)?/.exec(id);
			var base=parts[1];
			var increment=0;
			if(parts.length>2){
				increment=Number(parts[2]);
			}
			if(ext.log){
				ext.log.pauseTimer(timer);	
			}
			if(this._ids[base]!==undefined){
				this._ids[base]+=1;
				return String(base)+String(this._ids[base]);
			}else{
				this._ids[base]=increment;
				return id;
			}
		},
		toString:function(){
			return this.docString+this.xml.toXMLString().replace(/(\<[^\>]*?)xlink\-(.*?)=/g,'$1xlink:$2=');
		}
	};
	ext.extend({SVG:SVG});
})(extensible);
