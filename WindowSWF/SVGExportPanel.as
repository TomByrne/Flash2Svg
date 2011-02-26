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
	import flash.utils.getQualifiedClassName;
	import flash.net.navigateToURL;
	import flash.net.URLRequest;

	public class SVGExportPanel extends MovieClip
	{
		var initialized:Boolean=false;
		var debugging:Boolean=true;
		var init:Object={
			width:240,
			height:390
		};
		var timer:Timer=new Timer(1);
		var isCanceled:Boolean=false;
		var finished:Boolean=false;
		var jsDir:String;
		var exportInProgress=false;
		var swfPanelName:String='SVG';
		var dev:Boolean;
		var helpURL:URLRequest=new URLRequest('http://dissentgraphics.com/tools/flash2svg');
		public static const cGetASObjectData:String = "28";
		public function SVGExportPanel():void
		{
			super();
			//Initialize Javascript
			this.dev=(
				MMExecute([
					'if(!this.extensible){',
					'	fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");',
					'}',
					'extensible.dev.valueOf()'
				].join('\n'))=='true'
			);
			this.jsDir=MMExecute('extensible.dir.valueOf()');
			// Display
			stage.align=StageAlign.TOP_LEFT;
			stage.scaleMode=StageScaleMode.NO_SCALE;
			stage.addEventListener(Event.RESIZE,resize);
			//Buttons
			this.controls.browseBttn.addEventListener(
				MouseEvent.CLICK,
				browseForFile
			);
			this.controls.saveDeletePresetBttn.addEventListener(
				MouseEvent.CLICK,
				saveOrDeletePresets
			);
			this.controls.presetComboBox.addEventListener(
				Event.CHANGE,
				itemChange
			);
			this.controls.presetComboBox.addEventListener(
				Event.CLOSE,
				itemRollOut
			);
			this.controls.presetComboBox.addEventListener(
				ListEvent.ITEM_ROLL_OUT,
				itemRollOut
			);
			this.controls.exportBttn.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.controls.maskingTypeComboBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.sourceComboBox.addEventListener(
				Event.CHANGE,
				resize
			);
			this.controls.framesComboBox.addEventListener(
				Event.CHANGE,
				resize
			);
			this.controls.curveDegreeComboBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.expandSymbolsComboBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.applyTransformationsCheckBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.knockoutBackgroundColorCheckBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.fillGapsCheckBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.convertTextToOutlinesCheckBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.helpBttn.addEventListener(
				MouseEvent.CLICK,
				getHelp
			);
			this.controls.decimalPointPrecisionNumericStepper.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.controls.convertPatternsToSymbolsCheckBox.addEventListener(
				Event.CHANGE,
				setOptionsToCustom
			);
			this.scrollBar.addEventListener(
				ScrollEvent.SCROLL,
				scroll
			);
			//ProgressBar
			this.controls.progressbar.minimum=0;
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
			for(var i=0;i<this.controls.numChildren;i++){
				var child:DisplayObject=this.controls.getChildAt(i);
				this.init[child.name]={
					bounds:child.getBounds(this.controls),
					scaleX:child.scaleX,
					width:child.width,
					x:child.x,
					y:child.y
				};
			}
			// For some reasons, this only works after a delay...
			setTimeout(loaded,10);
		}
		public function getHelp(e:Event):void
		{
			navigateToURL(this.helpURL,"_blank");
		}
		public function documentChanged():Boolean
		{
			stage.focus=null;
			this.initialized=false;
			setTimeout(loaded,10);
			return true;
		}
		
		private function setOptionsToCustom(e:Event):void
		{
			for(var i=0;i<this.controls.presetComboBox.length;i++){
				if(this.controls.presetComboBox.text==this.controls.presetComboBox.getItemAt(i).label){
					this.controls.presetComboBox.text='Custom';
					break;
				}
			}
		}
		
		private function browseForFile(e:MouseEvent){
			var fileURI:String=MMExecute('fl.browseForFileURL("save","Export")');
			var filePath:String=MMExecute('"'+fileURI+'".relativeToDocument');
			this.controls.fileTextInput.text=filePath;
		}
		
		private function loaded(){
			this.scrollBarTextField.visible=false;
			this.scrollBar.width=9;
			this.controls.fillGapsCheckBox.visible=false; // this feature is not ready yet
			this.controls.knockoutBackgroundColorCheckBox.visible=false; // this feature is not ready yet
			this.controls.convertTextToOutlinesCheckBox.enabled=false; // text not yet supported, all is converted
			if(MMExecute('extensible.doc')!=='null'){
				if(MMExecute('extensible.doc.documentHasData("SVGExportPath")')=='true'){
					this.controls.fileTextInput.text=MMExecute('extensible.doc.getDataFromDocument("SVGExportPath")');
				}else if(MMExecute('extensible.doc.pathURI')!=='undefined'){
					this.controls.fileTextInput.text=MMExecute('extensible.doc.pathURI.relativeToDocument.stripExtension()')+'.svg';
				}else{
					this.controls.fileTextInput.text=MMExecute('extensible.doc.name.stripExtension()')+'.svg';
				}
			}
			this.loadPreset();
			setTimeout(this.resize,10,null);
		}
		
		private function resize(e:Event):void
		{
			stage.focus=null;
			var startWidth;
			if(this.scrollBar.visible){
				startWidth=this.init.width;
			}else{
				startWidth=this.init.width-14;
			}
			var stageWidth=(
				stage.stageWidth<startWidth?
				startWidth:
				stage.stageWidth
			);
			var stageScaleX=(
				stageWidth/startWidth
			);
			var stageScaleY=(
				stage.stageHeight/this.init.height
			);
			var verticalOffset:Number=0;
			var bottom=0;
			if(
				this.controls.framesComboBox.selectedItem.label!='Current'
			){
				verticalOffset+=30;
				this.controls.startFrameNumericStepper.visible=true;
				this.controls.endFrameNumericStepper.visible=true;
				this.controls.startFrameTextField.visible=true;
				this.controls.endFrameTextField.visible=true;
			}else{
				this.controls.startFrameNumericStepper.visible=false;
				this.controls.endFrameNumericStepper.visible=false;	
				this.controls.startFrameTextField.visible=false;
				this.controls.endFrameTextField.visible=false;			
			}
			if(
				this.controls.sourceComboBox.selectedItem.label!='Current Timeline'
			){
				this.controls.clipToScalingGridRadioButton.visible=true;
				this.controls.clipToBoundingBoxRadioButton.visible=true;
				this.controls.clipToTextField.visible=true;
				verticalOffset+=60;
			}else{
				this.controls.clipToScalingGridRadioButton.visible=false;
				this.controls.clipToBoundingBoxRadioButton.visible=false;
				this.controls.clipToTextField.visible=false;
			}
			var names='';
			for(var i=0;i<this.controls.numChildren;i++){
				var child=this.controls.getChildAt(i);
				var name=child.name;
				names+=name;
				if(
					this.init[name].width>65
				){
					child.width=stageWidth-(startWidth-this.init[name].width);
				}else{
					var bounds=child.getBounds(this);
					if(
						this.init[name].bounds.x+(this.init[name].width/2)>
						startWidth/2
					){
						child.x=(
							stageWidth-child.width-
							(
								startWidth-
								(this.init[name].bounds.x+this.init[name].width)
							)
						);
					}
				}
				child.y=this.init[child.name].y;
				if(
					verticalOffset &&
					this.init[child.name].y>this.controls.framesComboBox.y+10
				){
					child.y+=verticalOffset;
				}
				if(child.visible==true && child.y+child.height>bottom){
					bottom=child.y+child.height+15;
				}
			}
			this.controls.startFrameNumericStepper.y=this.init['startFrameNumericStepper'].y;
			this.controls.endFrameNumericStepper.y=this.init['endFrameNumericStepper'].y;
			this.controls.startFrameTextField.y=this.init['startFrameTextField'].y;
			this.controls.endFrameTextField.y=this.init['endFrameTextField'].y;
			this.controls.clipToScalingGridRadioButton.y=this.init['clipToScalingGridRadioButton'].y;
			this.controls.clipToBoundingBoxRadioButton.y=this.init['clipToBoundingBoxRadioButton'].y;
			this.controls.clipToTextField.y=this.init['clipToTextField'].y;
			if(
				this.controls.framesComboBox.selectedItem.label!='Current' &&
				this.controls.sourceComboBox.selectedItem.label!='Current Timeline'
			){
				this.controls.clipToScalingGridRadioButton.y+=30;
				this.controls.clipToBoundingBoxRadioButton.y+=30;
				this.controls.clipToTextField.y+=30;
			}
			//Scroll Bar
			this.scrollBar.update();
			this.scrollBarTextField.width=stage.stageWidth;
			this.scrollBarTextField.height=stage.stageHeight;
			this.scrollBarTextField.x=0;
			this.scrollBarTextField.y=0;
			this.scrollBar.y=0;
			this.scrollBar.x=stage.stageWidth-14;
			this.scrollBar.setSize(10,stage.stageHeight);
			var scrollTextArray=['\n'];
			for(i=0;i<=bottom/12.666666;i++){
				scrollTextArray.push('\n');
			}
			this.scrollBarTextField.text=scrollTextArray.join('');
			this.scrollBar.update();
			//
			if(
				stage.stageHeight>(i-2)*12.666666
			){
				if(this.scrollBar.visible){
					this.scrollBar.scrollPosition=0;
					this.scrollBar.visible=false;
					this.resize(e);
				}
			}else{
				if(!this.scrollBar.visible){
					this.scrollBar.visible=true;
					this.resize(e);
				}
			}
			
		}
		private function scroll(e:Event):void
		{
			this.controls.y=-((this.scrollBar.scrollPosition-1)*12.666666);
		}
		private function loadPreset():void
		{
			var xml:XML;
			if(!this.initialized){
				var presets:Array=MMExecute('FLfile.listFolder("'+this.jsDir+'/Settings/SVG/","files")').split(',');
				for(var n=0;n<presets.length;n++){
					var str=presets[n].split('.').slice(0,-1).join('.');
					var exists=false;
					for(var i=0;i<this.controls.presetComboBox.length;i++){
						if(str==this.controls.presetComboBox.getItemAt(i).label){
							exists=true;
							break;
						}
					}
					if(!exists){
						this.controls.presetComboBox.addItem({
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
				if(MMExecute('FLfile.exists("'+this.jsDir+'/Settings/SVG/'+this.controls.presetComboBox.selectedItem.label+'.xml")')!=='false'){
					xml=new XML(MMExecute('FLfile.read("'+this.jsDir+'/Settings/SVG/'+this.controls.presetComboBox.selectedItem.label+'.xml")'));
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
			for(var i=0;i<this.controls.presetComboBox.length;i++){
				if(xml['@title']==this.controls.presetComboBox.getItemAt(i).label){
					this.controls.presetComboBox.selectedIndex=i;
					break;
				}
			}
			if(xml['@title']){
				this.controls.presetComboBox.text=String(xml['@title']);				
			}
			for(i=0;i<this.controls.numChildren;i++){
				var child=this.controls.getChildAt(i);
				var type=getQualifiedClassName(child).split('::').pop();
				var option:String=child.name.replace(type,'');
				var element=xml[option];
				if(element.length()){
					element=String(element[0]);
					switch(type){
						case 'ComboBox':
							for(var n=0;n<child.length;n++){
								if(element==child.getItemAt(n).label){
									child.selectedIndex=n;
									break;
								}else if(Number(element)==n){
									child.selectedIndex=n;
								}
							}
							break;
						case 'CheckBox':
							child.selected=Boolean(['False','false','0'].indexOf(element)<0);
							break;
						case 'NumericStepper':
							child.value=Number(element);
							break;		
						case 'TextInput':
							child.text=element;
							break;					
					}
				}
			}
		}
		
		private function setSaveDeleteStatus(){
			var currentItem:String;
			var currentIndex=this.controls.presetComboBox.selectedIndex;
			if(currentIndex<0){
				this.controls.presetComboBox.selectedIndex=0;
				currentIndex=0;
				return;
			}
			currentItem=this.controls.presetComboBox.getItemAt(currentIndex).label;
			if(
				this.controls.saveDeletePresetBttn.enabled &&
				(
					'Illustrator'==currentItem||
					'Inkscape'==currentItem||
					'Web'==currentItem
				)
			){
				this.controls.saveDeletePresetBttn.enabled=false;
			}else if(!this.controls.saveDeletePresetBttn.enabled){
				this.controls.saveDeletePresetBttn.enabled=true;
			}
		}
		
		private function itemRollOut(e:Event){
			this.controls.saveDeletePresetBttn.label='Delete';
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
				this.controls.saveDeletePresetBttn.label='Save';	
			}else{
				this.controls.saveDeletePresetBttn.label='Delete';
			}
			this.controls.saveDeletePresetBttn.enabled=true;
		}
		
		private function deletePreset(e:Event):void
		{
			if(this.controls.presetComboBox.selectedIndex<0){
				this.controls.presetComboBox.text="";
				this.controls.presetComboBox.selectedIndex=0;
			}else{
				MMExecute('FLfile.remove("'+this.jsDir+'/Settings/SVG/'+this.controls.presetComboBox.text+'.xml")');
				for(var i=0;i<this.controls.presetComboBox.length;i++){
					if(this.controls.presetComboBox.getItemAt(i).label==this.controls.presetComboBox.text){
						this.controls.presetComboBox.removeItemAt(i);
					}
				}
			}
			this.controls.presetComboBox.selectedIndex=0;
			this.loadPreset();
			this.setSaveDeleteStatus();
		}
		
		private function saveOrDeletePresets(e:Event):void
		{
			if(e.target.label=='Delete'){
				return this.deletePreset(e);
			}
			var settingsTitle=this.controls.presetComboBox.text;
			var xml=this.getOptionsXML(false);
			this.controls.presetComboBox.addItem({label:String(xml['@title'])});
			var fileURI=this.jsDir+'/Settings/SVG/'+String(xml['@title'])+'.xml';
			var output=(
				'decodeURIComponent("'+encodeURIComponent(fileURI)+'"),'+
				'decodeURIComponent("'+encodeURIComponent(xml.toXMLString())+'")'
			);
			MMExecute('FLfile.write('+output+');');
			this.controls.saveDeletePresetBttn.label='Delete';
			this.setSaveDeleteStatus();
			this.controls.presetComboBox.selectedIndex=this.controls.presetComboBox.length-1;
		}
		
		private function getOptionsXML(includeFileSpecificSettings:Boolean):XML
		{
			var controlList=[
				'maskingType','curveDegree','expandSymbols','applyTransformations','decimalPointPrecision',
				'fillGaps','knockoutBackgroundColor','convertTextToOutlines','convertPatternsToSymbols'
			];
			if(includeFileSpecificSettings){
				controlList.push(
					'file','source','frames','startFrame','endFrame','clipToBoundingBox','clipToScalingGrid'
				);
			};
			var xml=new XML('<Settings title="'+this.controls.presetComboBox.text+'"/>');
			for(var i=0;i<this.controls.numChildren;i++){
				var child=this.controls.getChildAt(i);
				var type=getQualifiedClassName(child).split('::').pop();
				var option:String=child.name.replace(type,'');
				if(
					controlList.indexOf(option)>-1 &&
					child.visible
				){
					switch(type){
						case 'ComboBox':
							xml.appendChild(new XML(
								'<'+option+'>'+child.selectedItem.label+'</'+option+'>'
							));
							break;
						case 'CheckBox':
							xml.appendChild(new XML(
								'<'+option+'>'+String(child.selected)+'</'+option+'>'
							));
							break;
						case 'RadioButton':
							xml.appendChild(new XML(
								'<'+option+'>'+String(child.selected)+'</'+option+'>'
							));
							break;
						case 'NumericStepper':
							xml.appendChild(new XML(
								'<'+option+'>'+String(child.value)+'</'+option+'>'
							));
							break;
						case 'TextInput':
							xml.appendChild(new XML(
								'<'+option+'>'+String(child.text)+'</'+option+'>'
							));
							break;					
					}
				}
			}
			return xml;
		}
		
		private function exportSVG(e:Event):void
		{
			this.isCanceled=this.finished=false;
			//Switch exportBttn to 'Cancel'
			this.exportInProgress=true;
			this.controls.exportBttn.label='Cancel';
			this.controls.exportBttn.removeEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.controls.exportBttn.addEventListener(
				MouseEvent.CLICK,
				cancel
			);
			// Show indeterminate bar until progress starts...
			this.controls.progressbar.indeterminate=true;
			this.controls.progressbar.mode=ProgressBarMode.EVENT;
			ExternalInterface.addCallback('setProgress',setProgress);
			ExternalInterface.addCallback('endProgress',endProgress);
			//ExternalInterface.addCallback('getASElementInfo',getASElementInfo);
			//Save options
			MMExecute([
				'extensible.doc.addDataToDocument(',
				'	"SVGExportOptions",',
				'	"string",',
				'	decodeURIComponent("'+encodeURIComponent(this.getOptionsXML(true).toXMLString())+'")',
				')'
			].join('\n'));
			//Retrieve options...
			var fileLoc=this.controls.fileTextInput.text;
			var uri=MMExecute('FLfile.platformPathToURI(decodeURIComponent("'+encodeURIComponent(fileLoc)+'"))');
			var xml=this.getOptionsXML(true);
			xml['swfPanelName']='SVG';
			if(this.dev){
				MMExecute([
					'if(extensible && extensible.builderURI){',
					'	fl.runScript(extensible.builderURI);',
					'}',
					'fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");'
				].join('\n'));
			}
			var cmd=[
				'extensible.que.push(',
				'	new extensible.SVG(',
						xml.toXMLString(),
				'	)',
				');'
			].join('\n');
			MMExecute(cmd);
		}
		/*public function getASElementInfo(element:String):String
		{
			return  ExternalInterface.call(this.cGetASObjectData,element);
		}*/
		private function cancel(e:Event):void
		{
			if(this.isCanceled||this.finished){return;}
			this.isCanceled=true;
			this.endProgress();
			var killed;
			try{
				killed=MMExecute('extensible.que.kill()');
			}catch(e){}
			if(!killed=='true'){ // If kill command does not return "true"
				this.controls.progressbar.setProgress(0,100);
			}
			MMExecute('fl.trace("SVG Export Failed")');
		}
		
		private function processQue(e:Event):void
		{
			if(this.isCanceled||this.finished){return;}
			if(this.timer.delay<100){this.timer.delay=100;}
			// attempt to process the que
			var success,err;
			try{
				success=MMExecute('extensible.que.process()');
			}catch(err){}
			if(success=='true'){
				this.timer.stop();
			}else{ // increase the delay with each failure
				//MMExecute('fl.trace("'+success+'")');
				if(this.timer.delay>120){
					this.cancel(e);
				}
				this.timer.delay+=20;
			}
		}
		
		public function setProgress(completed:Number,max:Number):Boolean
		{
			this.controls.progressbar.indeterminate=false;
			this.controls.progressbar.mode=ProgressBarMode.MANUAL;
			this.controls.progressbar.setProgress(completed,max);
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
			this.timer.start();
			return true;
		}
		
		public function endProgress():Boolean
		{
			this.controls.progressbar.indeterminate=false;
			this.controls.progressbar.mode=ProgressBarMode.MANUAL;
			// return exportBttn to original state
			this.controls.exportBttn.label='Export';
			this.controls.exportBttn.removeEventListener(
				MouseEvent.CLICK,
				cancel
			);
			this.controls.exportBttn.addEventListener(
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
				//MMExecute('fl.trace("Export Successful: "+decodeURIComponent("'+encodeURIComponent(this.controls.fileTextInput.text)+'"))');
			}
			return true;
		}
		
	}
}