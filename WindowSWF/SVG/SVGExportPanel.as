package {
	import adobe.utils.MMEndCommand;
	import adobe.utils.MMExecute;
	import adobe.utils.XMLUI;
	
	import fl.controls.ProgressBarMode;
	import fl.events.ListEvent;
	import fl.events.ScrollEvent;
	
	import flash.display.DisplayObject;
	import flash.display.MovieClip;
	import flash.display.Stage;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.events.ProgressEvent;
	import flash.events.TimerEvent;
	import flash.external.ExternalInterface;
	import flash.text.TextFieldAutoSize;
	import flash.text.TextFormat;
	import flash.text.TextFormatAlign;
	import flash.utils.Timer;
	import flash.utils.setTimeout;

	public class SVGExportPanel extends MovieClip
	{
		var initialized:Boolean=false;
		var debugging:Boolean=true;
		var init:Object={
			width:360,
			height:270
		};
		var timer:Timer=new Timer(1);
		var isCanceled:Boolean=false;
		var jsDir:String;
		var exportInProgress=false;
		var swfPanelName:String='SVG';
		public function SVGExportPanel():void
		{
			super();
			//Initialize Javascript
			MMExecute('if(!this.extensible){fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");}');
			this.jsDir=MMExecute('extensible.dir.valueOf()');
			// Display
			stage.align=StageAlign.TOP_LEFT;
			stage.scaleMode=StageScaleMode.NO_SCALE;
			stage.addEventListener(Event.RESIZE,resize);
			//Buttons
			this.browseBttn.addEventListener(
				MouseEvent.CLICK,
				browseForFile
			);
			this.saveDeletePresetBttn.addEventListener(
				MouseEvent.CLICK,
				saveOrDeletePresets
			);
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
			this.exportBttn.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.maskingTypeOptionBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.curveDegreeOptionBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.expandSymbolsCheckBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.applyTransformationsCheckBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.knockoutBackgroundColorCheckBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.fillGapsCheckBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.convertTextToOutlinesCheckBox.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			this.decimalPointPrecisionNumericStepper.addEventListener(
				Event.CHANGE,
				setoptionsToCustom
			);
			//ProgressBar
			this.progressbar.minimum=0;
			this.timer.repeatCount=2999;
			// Document change...
			ExternalInterface.addCallback('documentChanged',documentChanged);
			MMExecute([
				'fl.addEventListener(',
				'	"documentChanged",',
				'	function(){',
				'		extensible.swfPanel("'+this.swfPanelName+'").call("documentChanged");',
				'	}',
				');'
			].join('\n'));
			//Get original display positions
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
			// For some reasons, this only works after a delay...
			setTimeout(loaded,10);
		}
		public function documentChanged():Boolean
		{
			stage.focus=null;
			this.initialized=false;
			setTimeout(loaded,10);
			return true;
		}
		private function setoptionsToCustom(e:Event):void
		{
			for(var i=0;i<this.presetOptionBox.length;i++){
				if(this.presetOptionBox.text==this.presetOptionBox.getItemAt(i).label){
					this.presetOptionBox.text='Custom';
					break;
				}
			}
		}
		private function browseForFile(e:MouseEvent){
			var fileURI:String=MMExecute('fl.browseForFileURL("save","Export")');
			var filePath:String=MMExecute('FLfile.uriToPlatformPath("'+fileURI+'")');
			this.fileTextInput.text=filePath;
		}
		private function loaded(){
			this.fillGapsCheckBox.visible=false; // this feature is not ready yet
			this.knockoutBackgroundColorCheckBox.visible=false; // this feature is not ready yet
			this.convertTextToOutlinesCheckBox.enabled=false; // text not yet supported, all is converted
			if(MMExecute('extensible.doc')!=='null'){
				if(MMExecute('extensible.doc.documentHasData("SVGExportPath")')=='true'){
					this.fileTextInput.text=MMExecute('extensible.doc.getDataFromDocument("SVGExportPath")');
				}else{
					this.fileTextInput.text=MMExecute('FLfile.uriToPlatformPath(extensible.doc.pathURI.stripExtension())')+'.svg';
				}
			}	
			this.loadPreset();
		}
		private function resize(e:Event):void
		{
			stage.focus=null;
			var stageWidth=(
				stage.stageWidth<this.init.width?
				this.init.width:
				stage.stageWidth
			);
			var stageScaleX=(
				stageWidth/this.init.width
			);
			var names='';
			for(var i=0;i<this.numChildren;i++){
				var child=this.getChildAt(i);
				var name=child.name;
				names+=name;
				if(
					this.init[name].width>this.init.width*.5
				){
					child.width=stageWidth-(this.init.width-this.init[name].width);
				}else if(this.init[name].width>105){
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
							stageWidth-child.width-
							(
								this.init.width-
								(this.init[name].bounds.x+this.init[name].width)
							)
						);
					}
				}
			}		
		}
		private function loadPreset():void
		{
			var xml:XML;
			if(!this.initialized){
				var presets:Array=MMExecute('FLfile.listFolder("'+this.jsDir+'/Settings/SVG/","files")').split(',');
				for(var n=0;n<presets.length;n++){
					var str=presets[n].split('.').slice(0,-1).join('.');
					var exists=false;
					for(var i=0;i<this.presetOptionBox.length;i++){
						if(str==this.presetOptionBox.getItemAt(i).label){
							exists=true;
							break;
						}
					}
					if(!exists){
						this.presetOptionBox.addItem({
							label:str,
							data:str
						});
					}
				}
				if(
					MMExecute('extensible.doc')!=='null' &&
					MMExecute('extensible.doc.documentHasData("SVGExportOptions")')=='true'
				){
					xml=new XML(MMExecute('extensible.doc.getDataFromDocument("SVGExportOptions")'));
				}else{
					var defaultSetting=MMExecute('FLfile.read("'+this.jsDir+'/Settings/SVG/.defaults")');
					if(MMExecute('FLfile.exists("'+this.jsDir+'/Settings/SVG/'+defaultSetting+'.xml")')!=='false'){
						defaultSetting='Illustrator';
					}else if(presets.length>0){
						defaultSetting=presets[0].split('.').slice(0,-1).join('.');
					}
					xml=new XML(MMExecute('FLfile.read("'+this.jsDir+'/Settings/SVG/'+defaultSetting+'.xml")'));
				}
			}else{
				if(MMExecute('FLfile.exists("'+this.jsDir+'/Settings/SVG/'+this.presetOptionBox.selectedItem.label+'.xml")')!=='false'){
					xml=new XML(MMExecute('FLfile.read("'+this.jsDir+'/Settings/SVG/'+this.presetOptionBox.selectedItem.label+'.xml")'));
				}				
			};
			if(!xml){
				return;
			}
			this.setOptionsFromXML(xml);
			if(!initialized){
				this.setSaveDeleteStatus();	
			}
			this.initialized=true;
		}
		private function setOptionsFromXML(xml:XML):void
		{
			for(var i=0;i<this.presetOptionBox.length;i++){
				if(xml['@title']==this.presetOptionBox.getItemAt(i).label){
					this.presetOptionBox.selectedIndex=i;
					break;
				}
			}
			if(xml['@title']){
				this.presetOptionBox.text=String(xml['@title']);				
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
			this.decimalPointPrecisionNumericStepper.value=Number(xml.decimalPointPrecision);
			this.knockoutBackgroundColorCheckBox.selected=Boolean(['False','false','0'].indexOf(String(xml.knockoutBackgroundColor))<0);
			this.fillGapsCheckBox.selected=Boolean(['False','false','0'].indexOf(String(xml.fillGaps))<0);
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
			this.loadPreset();
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
				MMExecute('FLfile.remove("'+this.jsDir+'/Settings/SVG/'+this.presetOptionBox.text+'.xml")');
				for(var i=0;i<this.presetOptionBox.length;i++){
					if(this.presetOptionBox.getItemAt(i).label==this.presetOptionBox.text){
						this.presetOptionBox.removeItemAt(i);
					}
				}
			}
			this.presetOptionBox.selectedIndex=0;
			this.loadPreset();
			this.setSaveDeleteStatus();
		}
		private function saveOrDeletePresets(e:Event):void
		{
			if(e.target.label=='Delete'){
				return this.deletePreset(e);
			}
			var settingsTitle=this.presetOptionBox.text;
			var xml=this.getOptionsXML();
			this.presetOptionBox.addItem({label:String(xml['@title'])});
			var fileURI=this.jsDir+'/Settings/SVG/'+String(xml['@title'])+'.xml';
			var output=(
				'unescape("'+escape(fileURI)+'"),'+
				'unescape("'+escape(xml.toXMLString())+'")'
			);
			MMExecute('FLfile.write('+output+');');
			this.saveDeletePresetBttn.label='Delete';
			this.setSaveDeleteStatus();
			this.presetOptionBox.selectedIndex=this.presetOptionBox.length-1;
		}
		private function getOptionsXML():XML
		{
			var xml=new XML('<Settings title="'+this.presetOptionBox.text+'"/>');
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
				'<decimalPointPrecision>'+String(this.decimalPointPrecisionNumericStepper.value)+'</decimalPointPrecision>'
			));
			xml.appendChild(new XML(
				'<fillGaps>'+String(this.fillGapsCheckBox.selected)+'</fillGaps>'
			));
			xml.appendChild(new XML(
				'<knockoutBackgroundColor>'+String(this.knockoutBackgroundColorCheckBox.selected)+'</knockoutBackgroundColor>'
			));
			xml.appendChild(new XML(
				'<convertTextToOutlines>'+String(this.convertTextToOutlinesCheckBox.selected)+'</convertTextToOutlines>'
			));
			return xml;
		}
		private function exportSVG(e:Event):void
		{
			this.isCanceled=false;
			//Switch exportBttn to 'Cancel'
			this.exportInProgress=true;
			this.exportBttn.label='Cancel';
			this.exportBttn.removeEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.exportBttn.addEventListener(
				MouseEvent.CLICK,
				cancel
			);
			// Show indeterminate bar until progress starts...
			this.progressbar.indeterminate=true;
			this.progressbar.mode=ProgressBarMode.EVENT;
			ExternalInterface.addCallback('setProgress',setProgress);
			ExternalInterface.addCallback('endProgress',endProgress);
			//Save options
			MMExecute([
				'extensible.doc.addDataToDocument(',
				'	"SVGExportOptions",',
				'	"string",',
				'	unescape("'+escape(this.getOptionsXML().toXMLString())+'")',
				')'
			].join('\n'));
			//Retrieve options...
			var fileLoc=this.fileTextInput.text;
			var uri=MMExecute('FLfile.platformPathToURI(unescape("'+escape(fileLoc)+'"))');
			var cmd=[
				'fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");',
				'extensible.que.push(',
				'	new extensible.SVG({',
				'		outputURI:"'+uri+'",',
				'		swfPanelName:"'+this.swfPanelName+'",',
				'		curveDegree:'+(this.curveDegreeOptionBox.selectedItem.label=='Quadratic'?'2':'3')+',',
				'		maskingType:"'+this.maskingTypeOptionBox.selectedItem.label+'",',
				'		expandSymbols:'+String(this.expandSymbolsCheckBox.selected)+',',
				'		applyTransformations:'+String(this.applyTransformationsCheckBox.selected)+',',
				'		decimalPointPrecision:'+String(this.decimalPointPrecisionNumericStepper.value)+',',
				'		fillGaps:'+String(this.fillGapsCheckBox.selected)+',',
				'		knockoutBackgroundColor:'+String(this.knockoutBackgroundColorCheckBox.selected),
				'	})',
				')'
			].join('\n');
			MMExecute(cmd);
		}
		private function cancel(e:Event):void
		{
			this.isCanceled=true;
			var killed;
			try{
				killed=MMExecute('extensible.que.kill()');
			}catch(e){}
			if(!killed=='true'){ // If kill command does not return "true"
				this.endProgress();
				progressbar.setProgress(0,100);
			}
			MMExecute('fl.trace("SVG Export Canceled")');
		}
		private function processQue(e:Event):void
		{
			if(this.isCanceled){return;}
			if(this.timer.delay<100){this.timer.delay=100;}
			// attempt to process the que
			var success;
			try{
				success=MMExecute('extensible.que.process()');
			}catch(e){}
			if(success=='true'){ 
				this.timer.stop();
			}else{ // increase the delay with each failure
				this.timer.delay+=20;
			}
		}
		public function setProgress(completed:Number,max:Number):Boolean
		{
			this.progressbar.indeterminate=false;
			this.progressbar.mode=ProgressBarMode.MANUAL;
			this.progressbar.setProgress(completed,max);
			// this is a total hack
			this.timer=new Timer(0);
			this.timer.addEventListener(
				TimerEvent.TIMER,
				processQue
			);
			this.timer.addEventListener(
				TimerEvent.TIMER_COMPLETE,
				function(e:Event){this.endProgress();}
			);
			timer.start();
			return true;
		}
		public function endProgress():Boolean
		{
			this.progressbar.indeterminate=false;
			this.progressbar.mode=ProgressBarMode.MANUAL;
			// return exportBttn to original state
			this.exportBttn.label='Export';
			this.exportBttn.removeEventListener(
				MouseEvent.CLICK,
				cancel
			);
			this.exportBttn.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			ExternalInterface.addCallback('setProgress',null);
			ExternalInterface.addCallback('endProgress',null);
			if(this.timer){
				this.timer.stop();
			}
			if(!this.isCanceled){
				this.setProgress(100,100);
				MMExecute('fl.trace("Export Successful: "+unescape("'+escape(this.fileTextInput.text)+'"))');
			}
			return true;
		}
		
	}
}