package{

import adobe.utils.MMEndCommand;
import adobe.utils.MMExecute;
import adobe.utils.XMLUI;

import fl.controls.ProgressBarMode;
import fl.events.ListEvent;
import fl.data.DataProvider;

import flash.events.*;
import flash.external.ExternalInterface;
import flash.text.*;
import flash.utils.*;
import flash.net.*;
import flash.ui.*;


import flash.display.*;
import fl.containers.*;
import fl.controls.*;

import assets.ControlLayout;


public class PanelRoot extends MovieClip{


	private var initialized:Boolean=false;
	private var timer:Timer=new Timer(1);
	private var isCanceled:Boolean=false;
	private var finished:Boolean=false;
	private var jsDir:String;
	private var swfPanelName:String='SVG';


	private var controlsLayout:ControlLayout;
	private var controlsLogic:ControlsLogic;

	private var fileDataMap:Dictionary;
	private var presetDataMap:Dictionary;

	private var _dev:Boolean;

	public function get dev():Boolean{
		return _dev;
	}
	public function set dev(value:Boolean):void{
		_dev = value;
		context.customItems = _dev?[devModeOnItem]:[devModeOffItem];
	}

	private var context:ContextMenu;
	private var devModeOnItem:ContextMenuItem;
	private var devModeOffItem:ContextMenuItem;
	
	public function PanelRoot(){

		this.alpha = 0;

		controlsLayout = new ControlLayout();
		scrollPane.source = controlsLayout;

		controlsLogic = new ControlsLogic(controlsLayout);


		devModeOnItem = new ContextMenuItem("Turn dev mode off");
		devModeOnItem.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, toggleDevMode);

		devModeOffItem = new ContextMenuItem("Turn dev mode on");
		devModeOffItem.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, toggleDevMode);

		context = new ContextMenu();
		context.hideBuiltInItems();
		this.contextMenu = context;

		stage.align=StageAlign.TOP_LEFT;
		stage.scaleMode=StageScaleMode.NO_SCALE;

		setTimeout(doIntro, 500); // delays allow components to initialise fully

		var panelRef:PanelRoot = this;


		//Initialize Javascript
		dev=(
			MMExecute([
				'if(!this.extensible){',
				'	fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");',
				'}',
				'extensible.dev.valueOf()'
			].join('\n'))=='true'
		);
		this.jsDir=MMExecute('extensible.dir.valueOf()');

		this.controlsLayout.framesRow.input.dataProvider = new DataProvider([{label:'All Frames', showFrameInput:false, 		data:"all"},
																		{label:'Current Frame', showFrameInput:false, 			data:"current"},
																		{label:'Custom Range', showFrameInput:true, 			data:"custom"}]);

		this.controlsLayout.sourceRow.input.dataProvider = new DataProvider([{label:'Current Timeline', showBoundsInput:false, 	data:"current"},
																		{label:'Selected Library Items', showBoundsInput:true, 	data:"libraryItems"}]);

		this.controlsLayout.outputRow.input.dataProvider = new DataProvider([{label:'Animated SVG', showFlattenMotion:true, 	data:"animation"},
																		{label:'SVG Images', showFlattenMotion:false, 			data:"images"}]);

		fileDataMap = new Dictionary();
		fileDataMap[controlsLayout.sourceRow.input] = "source";
		fileDataMap[controlsLayout.clippingRow.clipToScalingGridRadioButton] = "clipToScalingGrid";
		fileDataMap[controlsLayout.clippingRow.clipToBoundingBoxRadioButton] = "clipToBoundingBox";
		fileDataMap[controlsLayout.framesRow.input] = "frames";
		fileDataMap[controlsLayout.customFramesRow.startFrameNumericStepper] = "startFrame";
		fileDataMap[controlsLayout.customFramesRow.endFrameNumericStepper] = "endFrame";
		fileDataMap[controlsLayout.fileRow.input] = "file";
		fileDataMap[controlsLayout.outputRow.input] = "output";

		presetDataMap = new Dictionary();
		presetDataMap[controlsLayout.masksRow.input] = "maskingType";
		presetDataMap[controlsLayout.decimalRow.input] = "decimalPointPrecision";
		presetDataMap[controlsLayout.curvesRow.input] = "curveDegree";
		presetDataMap[controlsLayout.expandRow.input] = "expandSymbols";
		presetDataMap[controlsLayout.applyTransformationsCheckBox] = "applyTransformations";
		presetDataMap[controlsLayout.convertPatternsToSymbolsCheckBox] = "convertPatternsToSymbols";
		presetDataMap[controlsLayout.flattenMotionCheckBox] = "flattenMotion";
		
		//Buttons
		this.controlsLayout.fileRow.button.addEventListener(
			MouseEvent.CLICK,
			browseForFile
		);
		this.controlsLayout.presetRow.deleteButton.addEventListener(
			MouseEvent.CLICK,
			saveOrDeletePresets
		);
		this.controlsLayout.presetRow.comboBox.addEventListener(
			Event.CHANGE,
			itemChange
		);
		this.controlsLayout.presetRow.comboBox.addEventListener(
			Event.CLOSE,
			itemRollOut
		);
		this.controlsLayout.presetRow.comboBox.addEventListener(
			ListEvent.ITEM_ROLL_OUT,
			itemRollOut
		);
		this.controlsLayout.exportButton.addEventListener(
			MouseEvent.CLICK,
			exportSVG
		);
		this.controlsLayout.masksRow.input.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		this.controlsLayout.sourceRow.input.addEventListener(
			Event.CHANGE,
			onSourceChanged
		);
		this.controlsLayout.framesRow.input.addEventListener(
			Event.CHANGE,
			onFramesChanged
		);
		this.controlsLayout.outputRow.input.addEventListener(
			Event.CHANGE,
			onOutputChanged
		);
		this.controlsLayout.decimalRow.input.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		this.controlsLayout.curvesRow.input.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		this.controlsLayout.expandRow.input.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		this.controlsLayout.applyTransformationsCheckBox.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		this.controlsLayout.convertPatternsToSymbolsCheckBox.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		this.controlsLayout.flattenMotionCheckBox.addEventListener(
			Event.CHANGE,
			setOptionsToCustom
		);
		//ProgressBar
		this.controlsLayout.progressBar.minimum=0;
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
		// For some reasons, this only works after a delay...
		setTimeout(loaded,500);
	}

	private function toggleDevMode(e:Event):void{
		dev = !dev;
	}

	private function doIntro():void{
		this.alpha = 1;
		// this initialises the controls
		controlsLogic.setSize(scrollPane.width-(scrollPane.verticalScrollBar.visible?15:0), scrollPane.height);

		stage.addEventListener(Event.RESIZE,onStageResize);
		onStageResize();
	}

	private function onStageResize(e:Event=null):void{
		scrollPane.setSize(stage.stageWidth, stage.stageHeight);
		controlsLogic.setSize(stage.stageWidth-(scrollPane.verticalScrollBar.visible?15:0), stage.stageHeight);
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
		for(var i=0;i<this.controlsLayout.presetRow.comboBox.length;i++){
			if(this.controlsLayout.presetRow.comboBox.text==this.controlsLayout.presetRow.comboBox.getItemAt(i).label){
				this.controlsLayout.presetRow.comboBox.text='Custom';
				break;
			}
		}
	}
	
	private function browseForFile(e:MouseEvent){
		var fileURI:String=MMExecute('fl.browseForFileURL("save","Export")');
		var filePath:String=MMExecute('"'+fileURI+'".relativeToDocument');
		this.controlsLayout.fileRow.input.text=filePath;
	}
	
	private function loaded(){
		if(MMExecute('extensible.doc')!=='null'){
			if(MMExecute('extensible.doc.documentHasData("SVGExportPath")')=='true'){
				this.controlsLayout.fileRow.input.text=MMExecute('extensible.doc.getDataFromDocument("SVGExportPath")');
			}else if(MMExecute('extensible.doc.pathURI')!=='undefined'){
				this.controlsLayout.fileRow.input.text=MMExecute('extensible.doc.pathURI.relativeToDocument.stripExtension()')+'.svg';
			}else{
				this.controlsLayout.fileRow.input.text=MMExecute('extensible.doc.name.stripExtension()')+'.svg';
			}
		}
		this.loadPreset();
		//setTimeout(this.resize,10,null);
	}
	
	private function onSourceChanged(e:Event=null):void{
		this.controlsLayout.clippingRow.visible = (this.controlsLayout.sourceRow.input.selectedItem && this.controlsLayout.sourceRow.input.selectedItem.showBoundsInput);
		controlsLogic.update();
	}
	private function onFramesChanged(e:Event=null):void{
		this.controlsLayout.customFramesRow.visible = (this.controlsLayout.framesRow.input.selectedItem && this.controlsLayout.framesRow.input.selectedItem.showFrameInput);
		controlsLogic.update();
	}
	private function onOutputChanged(e:Event=null):void{
		this.controlsLayout.flattenMotionCheckBox.visible=(this.controlsLayout.outputRow.input.selectedItem && this.controlsLayout.outputRow.input.selectedItem.showFlattenMotion);
		controlsLogic.update();
	}
	private function loadPreset():void
	{
		var xml:XML;
		if(!this.initialized){
			var presets:Array=MMExecute('FLfile.listFolder("'+this.jsDir+'/Settings/SVG/","files")').split(',');
			for(var n=0;n<presets.length;n++){
				var str=presets[n].split('.').slice(0,-1).join('.');
				var exists=false;
				for(var i=0;i<this.controlsLayout.presetRow.comboBox.length;i++){
					if(str==this.controlsLayout.presetRow.comboBox.getItemAt(i).label){
						exists=true;
						break;
					}
				}
				if(!exists){
					this.controlsLayout.presetRow.comboBox.addItem({
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
			if(MMExecute('FLfile.exists("'+this.jsDir+'/Settings/SVG/'+this.controlsLayout.presetRow.comboBox.selectedItem.label+'.xml")')!=='false'){
				xml=new XML(MMExecute('FLfile.read("'+this.jsDir+'/Settings/SVG/'+this.controlsLayout.presetRow.comboBox.selectedItem.label+'.xml")'));
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
		var i:int=0;
		for(i=0;i<this.controlsLayout.presetRow.comboBox.length;i++){
			if(xml['@title']==this.controlsLayout.presetRow.comboBox.getItemAt(i).label){
				this.controlsLayout.presetRow.comboBox.selectedIndex=i;
				break;
			}
		}
		if(xml['@title']){
			this.controlsLayout.presetRow.comboBox.text=String(xml['@title']);				
		}
		var dataMaps = [fileDataMap, presetDataMap];

		for(i=0; i<dataMaps.length; ++i){
			var dataMap = dataMaps[i];
			for(var input in dataMap){
				var option:String = dataMap[input];
				var value:String = xml.descendants().(name()==option).text();
				if(value){
					if(input is ComboBox){
						if(parseInt(value).toString()==value){
							input.selectedIndex=parseInt(value);
						}else{
							for(var n=0;n<input.length;n++){
								if(value==input.getItemAt(n).data){
									input.selectedIndex=n;
									break;
								}
							}
						}

					}else if(input is CheckBox || input is RadioButton){
						input.selected = Boolean(['False','false','0'].indexOf(value)<0);

					}else if(input is NumericStepper){
						input.value=parseFloat(value);

					}else if(input is TextInput){
						input.text=value;

					}
				}
			}
		}
		onSourceChanged();
		onFramesChanged();
		onOutputChanged();
	}
	
	private function setSaveDeleteStatus(){
		var currentItem:String;
		var currentIndex=this.controlsLayout.presetRow.comboBox.selectedIndex;
		if(currentIndex<0){
			this.controlsLayout.presetRow.comboBox.selectedIndex=0;
			currentIndex=0;
			return;
		}
		currentItem=this.controlsLayout.presetRow.comboBox.getItemAt(currentIndex).label;
		if(
			controlsLayout.presetRow.deleteButton.enabled &&
			(
				'Illustrator'==currentItem||
				'Inkscape'==currentItem||
				'Web'==currentItem
			)
		){
			controlsLayout.presetRow.deleteButton.enabled=false;
		}else if(!controlsLayout.presetRow.deleteButton.enabled){
			controlsLayout.presetRow.deleteButton.enabled=true;
		}
	}
	
	private function itemRollOut(e:Event){
		controlsLayout.presetRow.deleteButton.label='Delete';
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
			controlsLayout.presetRow.deleteButton.label='Save';	
		}else{
			controlsLayout.presetRow.deleteButton.label='Delete';
		}
		controlsLayout.presetRow.deleteButton.enabled=true;
	}
	
	private function deletePreset(e:Event):void
	{
		if(this.controlsLayout.presetRow.comboBox.selectedIndex<0){
			this.controlsLayout.presetRow.comboBox.text="";
			this.controlsLayout.presetRow.comboBox.selectedIndex=0;
		}else{
			MMExecute('FLfile.remove("'+this.jsDir+'/Settings/SVG/'+this.controlsLayout.presetRow.comboBox.text+'.xml")');
			for(var i=0;i<this.controlsLayout.presetRow.comboBox.length;i++){
				if(this.controlsLayout.presetRow.comboBox.getItemAt(i).label==this.controlsLayout.presetRow.comboBox.text){
					this.controlsLayout.presetRow.comboBox.removeItemAt(i);
				}
			}
		}
		this.controlsLayout.presetRow.comboBox.selectedIndex=0;
		this.loadPreset();
		this.setSaveDeleteStatus();
	}
	
	private function saveOrDeletePresets(e:Event):void
	{
		if(e.target.label=='Delete'){
			return this.deletePreset(e);
		}
		var settingsTitle=this.controlsLayout.presetRow.comboBox.text;
		var xml=this.getOptionsXML(false);
		this.controlsLayout.presetRow.comboBox.addItem({label:String(xml['@title'])});
		var fileURI=this.jsDir+'/Settings/SVG/'+String(xml['@title'])+'.xml';
		var output=(
			'decodeURIComponent("'+encodeURIComponent(fileURI)+'"),'+
			'decodeURIComponent("'+encodeURIComponent(xml.toXMLString())+'")'
		);
		MMExecute('FLfile.write('+output+');');
		controlsLayout.presetRow.deleteButton.label='Delete';
		this.setSaveDeleteStatus();
		this.controlsLayout.presetRow.comboBox.selectedIndex=this.controlsLayout.presetRow.comboBox.length-1;
	}
	
	private function getOptionsXML(includeFileSpecificSettings:Boolean):XML
	{
		var dataMaps = (includeFileSpecificSettings?[fileDataMap, presetDataMap]:[presetDataMap]);

		var xml=new XML('<Settings title="'+this.controlsLayout.presetRow.comboBox.text+'"/>');
		for(var i=0; i<dataMaps.length; ++i){
			var dataMap = dataMaps[i];
			for(var input in dataMap){
				var option:String = dataMap[input];
				if(input is ComboBox){
					xml.appendChild(new XML(
						'<'+option+'>'+input.selectedItem.data+'</'+option+'>'
					));

				}else if(input is CheckBox){
					xml.appendChild(new XML(
						'<'+option+'>'+String(input.selected)+'</'+option+'>'
					));

				}else if(input is RadioButton){
					xml.appendChild(new XML(
						'<'+option+'>'+String(input.selected)+'</'+option+'>'
					));

				}else if(input is NumericStepper){
					xml.appendChild(new XML(
						'<'+option+'>'+String(input.value)+'</'+option+'>'
					));

				}else if(input is TextInput){
					xml.appendChild(new XML(
						'<'+option+'>'+String(input.text)+'</'+option+'>'
					));

				}
			}
		}

		return xml;
	}
	
	private function exportSVG(e:Event):void
	{
		this.isCanceled=this.finished=false;
		//Switch exportBttn to 'Cancel'
		//this.exportInProgress=true;
		this.controlsLayout.exportButton.label='Cancel';
		this.controlsLayout.exportButton.removeEventListener(
			MouseEvent.CLICK,
			exportSVG
		);
		this.controlsLayout.exportButton.addEventListener(
			MouseEvent.CLICK,
			cancel
		);
		// Show indeterminate bar until progress starts...
		this.controlsLayout.progressBar.indeterminate=true;
		this.controlsLayout.progressBar.mode=ProgressBarMode.EVENT;
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
		var fileLoc=this.controlsLayout.fileRow.input.text;
		var uri=MMExecute('FLfile.platformPathToURI(decodeURIComponent("'+encodeURIComponent(fileLoc)+'"))');
		var xml=this.getOptionsXML(true);
		xml['swfPanelName']='SVG';
		if(dev){
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
			this.controlsLayout.progressBar.setProgress(0,100);
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
		this.controlsLayout.progressBar.indeterminate=false;
		this.controlsLayout.progressBar.mode=ProgressBarMode.MANUAL;
		this.controlsLayout.progressBar.setProgress(completed,max);
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
		this.controlsLayout.progressBar.indeterminate=false;
		this.controlsLayout.progressBar.mode=ProgressBarMode.MANUAL;
		// return exportBttn to original state
		this.controlsLayout.exportButton.label='Export';
		this.controlsLayout.exportButton.removeEventListener(
			MouseEvent.CLICK,
			cancel
		);
		this.controlsLayout.exportButton.addEventListener(
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
			//MMExecute('fl.trace("Export Successful: "+decodeURIComponent("'+encodeURIComponent(this.controlsLayout.fileRow.input.text)+'"))');
		}
		return true;
	}
}

}