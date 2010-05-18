package {
	import adobe.utils.MMExecute;
	import adobe.utils.XMLUI;
	
	import fl.events.ListEvent;
	import fl.events.ScrollEvent;
	
	import flash.display.DisplayObject;
	import flash.display.MovieClip;
	import flash.display.Stage;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.events.TimerEvent;
	import flash.external.ExternalInterface;
	import flash.utils.Timer;	
	public class SVGExportPanel extends MovieClip
	{
		var extensibleDir:String;
		var initialized:Boolean=false;
		var init:Object={
			width:360,
			height:300
		};
		public function SVGExportPanel()
		{
			super();
			if(ExternalInterface.available){
				stage.align=StageAlign.TOP_LEFT;
				stage.scaleMode=StageScaleMode.NO_SCALE;
				MMExecute('if(!this.extensible){fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");}');
				this.extensibleDir=MMExecute('extensible.dir.valueOf()');
				this.pleaseWaitText.visible=false;
				this.browseBttn.addEventListener(MouseEvent.CLICK,browseForFile);
				this.saveDeletePresetBttn.addEventListener(MouseEvent.CLICK,saveOrDeletePresets);
				this.presetOptionBox.addEventListener(
					Event.CHANGE,
					itemChange
				);
				this.presetOptionBox.addEventListener(
					Event.CLOSE,
					itemRollOut
				);
				this.presetOptionBox.addEventListener(
					ListEvent.ITEM_ROLL_OUT,
					itemRollOut
				);
				this.browseBttn.addEventListener(
					MouseEvent.CLICK,
					browseForFile
				);
				this.saveDeletePresetBttn.addEventListener(
					MouseEvent.CLICK,
					saveOrDeletePresets
				);
				this.okBttn.addEventListener(
					MouseEvent.CLICK,
					accept
				);
				this.cancelBttn.addEventListener(
					MouseEvent.CLICK,
					cancel
				);
				var timer:Timer = new Timer(10, 1);
				timer.addEventListener("timer",loaded);
				timer.start();
				this.stage.addEventListener(Event.RESIZE,resize);
			}
		}
		private function loaded(e:Event){
			for(var i=0;i<this.numChildren;i++){
				var child:DisplayObject=this.getChildAt(i);
				this.init[child.name]={
					bounds:child.getBounds(this),
						scaleX:child.scaleX,
						width:child.width,
						x:child.x,
						y:child.y
				};
			}
			var exportPath:String=MMExecute('extensible.doc.getDataFromDocument("SVGExportTo")');
			if(exportPath!='0'){
				this.fileTextInput.text=exportPath;
			}else if(['undefined','null'].indexOf(MMExecute('extensible.doc'))){
				this.fileTextInput.text=MMExecute('FLfile.uriToPlatformPath(extensible.doc.pathURI.stripExtension())')+'.svg';
			}
			this.loadPreset(e);
		}
		private function resize(e:Event):void
		{
			var stageScaleX=stage.stageWidth/this.init.width;
			var names='';
			for(var i=0;i<this.numChildren;i++){
				var child=this.getChildAt(i);
				var name=child.name;
				names+=name;
				if(
					this.init[name].width>this.init.width*.5
				){
					child.width=stage.stageWidth-(this.init.width-this.init[name].width);
				}else if(this.init[name].width>90){
					child.width=this.init[name].width*stageScaleX;
				}else{
					child.width=this.init[name].width;
				}
				if(this.init[name].width<this.init.width*.5){
					var bounds=child.getBounds(this);
					if(
						this.init[name].bounds.x+(this.init[name].width/2)>
						this.init.width/2
					){
						child.x=(
							stage.stageWidth-child.width-
							(
								this.init.width-
								(this.init[name].bounds.x+this.init[name].width)
							)
						);
					}
				}
			}		
		}
		private function browseForFile(e:MouseEvent){
			var fileURI:String=MMExecute('fl.browseForFileURL("save","Export SVG")');
			var filePath:String=MMExecute('FLfile.uriToPlatformPath("'+fileURI+'")');
			this.fileTextInput.text=filePath;
		}
		private function loadPreset(e:Event):void
		{
			var defaultSettings
			if(!this.initialized){
				
				defaultSettings=MMExecute('FLfile.read("'+this.extensibleDir+'/Settings/SVG/.defaults")');
				if(['False','false','0',false].indexOf(MMExecute('FLfile.exists("'+this.extensibleDir+'/Settings/SVG/'+defaultSettings+'.xml")'))){
					defaultSettings='Illustrator';
				}
				var presets:Array=MMExecute('FLfile.listFolder("'+this.extensibleDir+'/Settings/SVG/","files")').split(',');
				for(i=0;i<presets.length;i++){
					var str=presets[i].split('.').slice(0,-1).join('.');
					this.presetOptionBox.addItem({
						label:str,
						data:str
					});
				}
			}else{
				defaultSettings=this.presetOptionBox.selectedItem.label;
			};
			var xmlString:String=MMExecute('FLfile.read("'+this.extensibleDir+'/Settings/SVG/'+defaultSettings+'.xml")');
			var xml=new XML(xmlString);
			for(var i=0;i<this.presetOptionBox.length;i++){
				if(defaultSettings==this.presetOptionBox.getItemAt(i).label){
					this.presetOptionBox.selectedIndex=i;
					break;
				}
			}
			for(i=0;i<this.maskingTypeOptionBox.length;i++){
				if(String(xml.maskingType)==this.maskingTypeOptionBox.getItemAt(i).label){
					this.maskingTypeOptionBox.selectedIndex=i;
					break;
				}
			}
			for(i=0;i<this.curveDegreeOptionBox.length;i++){
				if(String(xml.curveDegree)==this.curveDegreeOptionBox.getItemAt(i).label){
					this.curveDegreeOptionBox.selectedIndex=i;
					break;
				}
			}
			this.expandSymbolsCheckBox.selected=Boolean(['False','false','0'].indexOf(String(xml.expandSymbols))<0);
			this.applyTransformationsCheckBox.selected=Boolean(['False','false','0'].indexOf(String(xml.applyTransformations))<0);
			this.decimalPointPrecisionTextInput.text=String(xml.decimalPointPrecision);
			this.knockoutBackgroundColorCheckBox.selected=Boolean(['False','false','0'].indexOf(String(xml.knockoutBackgroundColor))<0);
			this.fillGapsCheckBox.selected=Boolean(['False','false','0'].indexOf(String(xml.fillGaps))<0);
			if(!initialized){
				this.setSaveDeleteStatus();	
			}
			this.initialized=true;
		}
		private function setSaveDeleteStatus(){
			var currentItem:String;
			var currentIndex=this.presetOptionBox.selectedIndex;
			if(currentIndex<0){
				this.presetOptionBox.selectedIndex=0;
				currentIndex=0;
				return;
			}
			currentItem=this.presetOptionBox.getItemAt(currentIndex).label;
			if(
				this.saveDeletePresetBttn.enabled &&
				(
					'Illustrator'==currentItem||
					'Inkscape'==currentItem||
					'Web'==currentItem
				)
			){
				this.saveDeletePresetBttn.enabled=false;
			}else if(!saveDeletePresetBttn.enabled){
				this.saveDeletePresetBttn.enabled=true;
			}
		}
		private function itemRollOut(e:Event){
			this.saveDeletePresetBttn.label='Delete';
			this.setSaveDeleteStatus();
			this.loadPreset(e);
		}
		private function itemChange(e:Event){
			var unique=true;
			for(var i=0;i<e.target.length;i++){
				if(e.target.text==e.target.getItemAt(i).label){
					unique=false;
					break;
				}
			}
			if(unique){
				this.saveDeletePresetBttn.label='Save';	
			}else{
				this.saveDeletePresetBttn.label='Delete';
			}
			this.saveDeletePresetBttn.enabled=true;
		}
		private function deletePreset(e:Event):void
		{
			if(this.presetOptionBox.selectedIndex<0){
				this.presetOptionBox.text="";
				this.presetOptionBox.selectedIndex=0;
			}else{
				MMExecute('FLfile.remove("'+this.extensibleDir+'/Settings/SVG/'+this.presetOptionBox.text+'.xml")');
				for(var i=0;i<this.presetOptionBox.length;i++){
					if(this.presetOptionBox.getItemAt(i).label==this.presetOptionBox.text){
						this.presetOptionBox.removeItemAt(i);
					}
				}
			}
			this.presetOptionBox.selectedIndex=0;
			this.loadPreset(e);
			this.setSaveDeleteStatus();
		}
		private function saveOrDeletePresets(e:Event):void
		{
			if(e.target.label=='Delete'){
				return this.deletePreset(e);
			}
			var settingsTitle=this.presetOptionBox.text;
			this.presetOptionBox.addItem({label:settingsTitle});
			var xml=new XML('<Settings title="'+settingsTitle+'"/>');
			xml.appendChild(new XML(
				'<maskingType>'+this.maskingTypeOptionBox.selectedItem.label+'</maskingType>'
			));
			xml.appendChild(new XML(
				'<curveDegree>'+this.curveDegreeOptionBox.selectedItem.label+'</curveDegree>'
			));
			xml.appendChild(new XML(
				'<expandSymbols>'+String(this.expandSymbolsCheckBox.selected)+'</expandSymbols>'
			));
			xml.appendChild(new XML(
				'<applyTransformations>'+String(this.applyTransformationsCheckBox.selected)+'</applyTransformations>'
			));
			xml.appendChild(new XML(
				'<decimalPointPrecision>'+String(this.decimalPointPrecisionTextInput.text)+'</decimalPointPrecision>'
			));
			xml.appendChild(new XML(
				'<fillGaps>'+String(this.fillGapsCheckBox.selected)+'</fillGaps>'
			));
			xml.appendChild(new XML(
				'<knockoutBackgroundColor>'+String(this.knockoutBackgroundColorCheckBox.selected)+'</knockoutBackgroundColor>'
			));
			var fileURI=this.extensibleDir+'/Settings/SVG/'+settingsTitle+'.xml';
			var output=(
				'unescape("'+escape(fileURI)+'"),'+
				'unescape("'+escape(xml.toXMLString())+'")'
			);
			MMExecute('FLfile.write('+output+');');
			this.saveDeletePresetBttn.label='Delete';
			this.setSaveDeleteStatus();
			this.presetOptionBox.selectedIndex=this.presetOptionBox.length-1;
		}
		private function accept(e:Event):void
		{
			this.okBttn.enabled=false;
			var fileLoc=this.fileTextInput.text;
			if(fileLoc.indexOf('.')==0){ //its a document relative path
				fileLoc=fileLoc.replace(/^\./,MMExecute('extensible.doc.pathURI.dir'));
			}
			var uri=MMExecute('FLfile.platformPathToURI(unescape("'+escape(fileLoc)+'"))');
			var cmd=[
				'(function(ext){',
				'	ext.doc.addDataToDocument("SVGExportURI","string","'+uri+'".relativeToDocument);',
				'	var svg=new ext.SVG({',
				'		curveDegree:'+(this.curveDegreeOptionBox.selectedItem.label=='Quadratic'?'2':'3')+',',
				'		maskingType:"'+this.maskingTypeOptionBox.selectedItem.label+'",',
				'		expandSymbols:'+String(this.expandSymbolsCheckBox.selected)+',',
				'		applyTransformations:'+String(this.applyTransformationsCheckBox.selected)+',',
				'		decimalPointPrecision:'+String(this.decimalPointPrecisionTextInput.text)+',',
				'		fillGaps:'+String(this.fillGapsCheckBox.selected)+',',
				'		knockoutBackgroundColor:'+String(this.knockoutBackgroundColorCheckBox.selected),
				'	});',
				'	FLfile.write("'+uri+'",String(svg));',
				'	return true;',
				'})(extensible)'
			].join('');
			cmd='extensible.que.push(unescape("'+escape(cmd)+'"));';
			this.okBttn.enabled=true;
			MMExecute(cmd);
			//XMLUI.accept();
		}
		private function cancel(e:Event):void
		{
			this.okBttn.enabled=true;
			XMLUI.cancel();
		}
	}
}