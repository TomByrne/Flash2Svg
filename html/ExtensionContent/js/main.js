var csInterface;

var VERSION = 1;

var EXPORT_SETTINGS = "exportSettings";
var ACTIVE_PANELS = "activePanels";
var AUTO_SAVE_TIMELINE = "autoSaveTimeline";

var SOURCE = "source";
var FILE = "file";
var PRECISION = "decimalPointPrecision";
var EXPAND_SYMBOLS = "expandSymbols";
var RENDERING = "rendering";
var ROOT_SCALING = "rootScaling";
var ROOT_VIEWBOX = "animatedViewBox";
var CONVERT_PATTERNS = "convertPatternsToSymbols";
var APPLY_TRANSFORMS = "applyTransformations";
var APPLY_EFFECTS = "applyColorEffects";
var FLATTEN_MOTION = "flattenMotion";
var CURVE_DEGREE = "curveDegree";
var MASKING_TYPE = "maskingType";
var OUTPUT = "output";
var FRAMES = "frames";
var START_FRAME = "startFrame";
var END_FRAME = "endFrame";
var ANIMATED = "animated";
var TIMELINES = "timelines";
var BG_COLOR = "backgroundColor";
var INCLUDE_BG = "includeBackground";
var INCLUDE_HIDDEN_LAYERS = "includeHiddenLayers";
var INCLUDE_GUIDES = "includeGuides";
var CONVERT_TEXT_TO_OUTLINES = "convertTextToOutlines";
var EMBED_IMAGES = "embedImages";
var EMBED_AUDIO = "embedAudio";
var SELECTION = "selection";
var TRACE_LOG = "traceLog";
var BEGIN_ANIMATION = "beginAnimation";
var REPEAT_COUNT = "repeatCount";
var NON_ANIM_SHOW = "nonAnimatingShow";
var LOOP = "loop";
var LOOP_TWEENS = "loopTweens";
var DISCRETE_EASING = "discreteEasing";
var REMOVE_GROUPS = "removeGroups";
var COMPACT_OUTPUT = "compactOutput";
var AVOID_MITER = "avoidMiter";
var TWEEN_TYPE = "tweenType";
var REVERT = "revert";


var accordion;
var progBar;
var progLabel;
var exportButton;
var frameSelect;
var frameRange;
var frameRangeStart;
var frameRangeEnd;
var outputType;
var decimalInput;
var tweenTypeSelect;
var loopCheckbox;
var loopTweensCheckbox;
var autoSaveSetting;
var saveSettingsButton;
var loadSettingsButton;
var inputs;
var savePresetPanel;
var saveSourceSettings;
var saveOutputSettings;
var saveRootSettings;
var saveGraphicsSettings;
var saveAnimationSettings;
var previewReloadButton;
var previewFilename;
var previewBrowser;
var previewFrame;

var timelineSettingsStr;
var dir;
var settingsDir;
var presetsDir;

function onLoaded() {
	
	var self = this;

	accordion = $( "#accordion" );
	inputs = $("#accordion input,#accordion select");

    csInterface = new CSInterface();
	
    updateThemeWithAppSkinInfo(csInterface.hostEnvironment.appSkinInfo);
    // Update the color of the panel when the theme color of the product changed.
    csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);

    csInterface.addEventListener("com.adobe.events.flash.timelineChanged", onTimelineChanged);
    csInterface.addEventListener("com.adobe.events.flash.documentChanged", onDocumentChanged);
    csInterface.addEventListener("com.adobe.events.flash.documentClosed", onDocumentChanged);
    csInterface.addEventListener("com.adobe.events.flash.documentSaved", checkDefaultName);
    onDocumentChanged();
	

    presetSelect = $("#settings-select");
	savePresetPanel = $("#settings-add-panel");
	savePresetName = $("#settings-save-name");
	saveSourceSettings = $("#settings-save-source");
	saveOutputSettings = $("#settings-save-output");
	saveRootSettings = $("#settings-save-root");
	saveGraphicsSettings = $("#settings-save-graphics");
	saveAnimationSettings = $("#settings-save-animation");
	
    progBar = $( "#export-progress" );
    progLabel = $("#export-progress-label");
    exportButton = $( "#export-button" );
    
    sourceSelect = $("#source-timelines");
	frameSelect = $("#source-frames");
	frameRange = $("#customFrameRange");
	frameRangeStart = $("#frameRangeStart");
	frameRangeEnd = $("#frameRangeEnd");
	
	fileNameLabel = $("#output-file-label");
	fileNameInput = $("#output-file");
	outputType = $("#output-type");
	decimalInput = $("#output-decimal");
	decimalInputHint = $("#output-decimal-hint");
	
	animationWarning = $("#animation-warning");
	tweenTypeSelect = $("#anim-tween");
	loopCheckbox = $("#anim-loop");
	loopTweensCheckbox = $("#anim-looptweens");
	
	autoSaveSetting = $("#settings-autosave");
	saveSettingsButton = $("#settings-save");
	loadSettingsButton = $("#settings-load");

    previewFilename = $( "#preview-filename" );
    previewBrowser = $( "#preview-browser" );
    previewReloadButton = $( "#preview-reload-button" );
    previewFrame = $("#preview-img");

    previewFrame.on('load', function(){onPreviewLoaded($(this).contents());});

    var version = 0;
   
    var regexp = /WebKit\/([\d.]+)/;
    var result = regexp.exec(navigator.userAgent);
    if(result) {
    	previewBrowser.text("WebKit: "+parseFloat(result[1]));
    }else{
    	previewBrowser.text(navigator.userAgent);
    }
	
	progBar.progressbar({value:0});
    accordion.multiAccordion({active:[],
    	change:function(){
    	var list = accordion.multiAccordion("option", "active");
    	if(self.baseSettings)self.baseSettings.setProp(ACTIVE_PANELS, list.join(","));
    }});
    
    dir = removeLastPathPart(window.location.href);
	settingsDir = "SvgAnimationSettings/";
	presetsDir = settingsDir + "presets/";
    

    var files = [
    			'init',
    			'String',
    			'Object',
    			'Array',
    			'Matrix',
    			'Color',
    			'HalfEdge',
    			'Point',
    			'Curve',
    			'Vertex',
    			'Edge',
    			'Fill',
    			'Stroke',
    			'Contour',
    			'Element',
    			'Shape',
    			'OvalObject',
    			'RectangleObject',
    			'Instance',
    			'SymbolInstance',
    			'BitmapInstance',
    			'Text',
    			'TLFText',
    			'Frame',
    			'Layer',
    			'Timeline',
    			'Selection',
    			'LibraryItem',
    			'BitmapItem',
    			'FolderItem',
    			'SymbolItem',
    			'Library',
    			'Clipboard',
    			'Math',
    			'Task',
    			'SVG',
    			'Log',
    			'Que',
    			'Timer',
    			'Function',
    			'MathUtils',
    			'Geom'
    		];
    
    setProgressState(false, "Initialising", 0, files.length);
    var nextLoad = function(){
        setProgressState(true, "", 0, 0);
		loadPresets(loadInitialSettings);
    };
    for(var i=files.length-1; i>=0; i--){
    	nextLoad = createLoader(dir+'/Extensible/'+files[i]+".jsfl", nextLoad, i);
    }
    nextLoad();
    
    $(document.body).children().css("display", "");
}

function onPreviewLoaded(innerDom){
	var loadedSvg = innerDom.find( "svg" );
	if(loadedSvg.attr("preserveAspectRatio")!="xMidYMid meet"){
		loadedSvg.attr("preserveAspectRatio", "xMidYMid meet");
		var x = parseFloat(loadedSvg.attr("x"));
		var y = parseFloat(loadedSvg.attr("y"));
		var width = parseFloat(loadedSvg.attr("width"));
		var height = parseFloat(loadedSvg.attr("height"));
		loadedSvg.attr("viewBox", x+" "+y+" "+width+" "+height);
	}
}

function removeLastPathPart(uri){
	var lastSlash = uri.lastIndexOf("/");
	return uri.substr(0, lastSlash);
}
function loadPresets(onComplete){
    setProgressState(false, "Loading presets", false, 0);
	evalScript("extensible.loadSettingsListing('"+presetsDir+"')",
		function(res) {
			if(res){
				if(typeof(res)=="string")res = res.split(",");
				this.presets = res.concat();
				res.unshift("Select to apply");
				presetSelect.find("option").remove();
				$.each(res, function(key, value) {   
					presetSelect
				         .append($("<option></option>")
				         .attr("value",key)
				         .text(value)); 
				});
			}else{
				presetSelect
		         .append($("<option></option>")
		         .text('Save settings here ->')); 
			}
	        setProgressState(true, "", 0, 0);
        	if(onComplete)onComplete();
		}
	);
}
function loadInitialSettings(){
    setProgressState(false, "Loading settings", false, 0);
    
	this.baseSettings = new Settings(VERSION);
	this.settings = new Settings(VERSION);
	this.baseSettings.setProp(EXPORT_SETTINGS, this.settings);
	ControlBinder.bind(this.baseSettings, AUTO_SAVE_TIMELINE, autoSaveSetting);

	evalScript("extensible.loadAppSettings('svgPanel', '"+settingsDir+"')",
		function(res) {
			if(res)this.baseSettings.fill(res);
			loadTimelineSettings(!res);
   			onSourceTimelineChanged();
		}
	);

}
function loadTimelineSettings(forceLoad){
    var openStore = this.baseSettings.getProp(ACTIVE_PANELS);
    if(openStore == null) {
    	accordion.multiAccordion("showAll");
    }else {
        var list = openStore.split(",");
        for(var i=0; i<list.length; i++){
        	list[i] = parseInt(list[i]);
        }
        accordion.multiAccordion("option", "active", list);
    }
    
    
    setProgressState(true, "", 0, 0);
	this.baseSettings.change = closure(this, onBaseSettingsChanged);
	
	if(forceLoad || this.baseSettings.getProp(AUTO_SAVE_TIMELINE)){
		doLoadSettings(bindSettings);
	}else{
		bindSettings();
	}
}
function bindSettings(){
	ControlBinder.bind(this.settings, FILE, fileNameInput);
	ControlBinder.bind(this.settings, SOURCE, sourceSelect);
	ControlBinder.bind(this.settings, FRAMES, frameSelect);
	ControlBinder.bind(this.settings, START_FRAME, frameRangeStart);
	ControlBinder.bind(this.settings, END_FRAME, frameRangeEnd);
	ControlBinder.bind(this.settings, OUTPUT, outputType);
	ControlBinder.bind(this.settings, PRECISION, decimalInput);
	ControlBinder.bind(this.settings, RENDERING, $("#root-rendering"));
	ControlBinder.bind(this.settings, ROOT_SCALING, $("#root-scaling"));
	ControlBinder.bind(this.settings, ROOT_VIEWBOX, $("#root-viewbox"));
	ControlBinder.bind(this.settings, EXPAND_SYMBOLS, $("#output-expand"));
	ControlBinder.bind(this.settings, REMOVE_GROUPS, $("#output-ungroup"));
	ControlBinder.bind(this.settings, COMPACT_OUTPUT, $("#output-compact"));
	ControlBinder.bind(this.settings, AVOID_MITER, $("#output-remove-miter"));
	ControlBinder.bind(this.settings, MASKING_TYPE, $("#graphics-masks"));
	ControlBinder.bind(this.settings, CURVE_DEGREE, $("#graphics-curves"));
	ControlBinder.bind(this.settings, CONVERT_PATTERNS, $("#graphics-patterns"));
	ControlBinder.bind(this.settings, CONVERT_TEXT_TO_OUTLINES, $("#text-outlines"));
	ControlBinder.bind(this.settings, EMBED_IMAGES, $("#images-embed"));
	ControlBinder.bind(this.settings, EMBED_AUDIO, $("#audio-embed"));
	ControlBinder.bind(this.settings, INCLUDE_BG, $("#graphics-background"));
	ControlBinder.bind(this.settings, LOOP, loopCheckbox);
	ControlBinder.bind(this.settings, LOOP_TWEENS, loopTweensCheckbox);
	ControlBinder.bind(this.settings, BEGIN_ANIMATION, $("#anim-begin"));
	ControlBinder.bind(this.settings, TWEEN_TYPE, tweenTypeSelect);
	ControlBinder.bind(this.settings, REVERT, $("#export-revert"));
	this.settings.change = closure(this, onSettingsChanged);


	loopCheckbox.on("change", closure(this, onLoopChanged));
	onLoopChanged();
	
	frameSelect.on("change", closure(this, onFramesChanged));
	onFramesChanged();
	
	outputType.on("change", closure(this, onOutputChanged));
	onOutputChanged();
	
	decimalInput.on("change", closure(this, onPrecisionChanged));
	onPrecisionChanged();
	
	autoSaveSetting.on("change", closure(this, onAutoSaveChanged));
	checkSaveLoadButtons();
}

function onSettingsChanged(){
	if(this.baseSettings.getProp(AUTO_SAVE_TIMELINE)){
		doSaveSettings();
	}else{
		checkSaveLoadButtons();
	}
	onBaseSettingsChanged();
	onSourceTimelineChanged();
}
var saveWarned = false;
function onBaseSettingsChanged(){
	var settings = this.baseSettings.stringify();
	evalScript("extensible.saveAppSettings('svgPanel', '"+settingsDir+"', '"+settings+"')",
		function(res) {
			res = (res==true || res=="true");
			if(!res && !saveWarned){
				saveWarned = true;
				evalScript("fl.trace('There was a problem saving SVG settings')");
			}
		}
	);
}

function createLoader(uri, onComplete, index){
	return function(){
		var client = new XMLHttpRequest();
	    client.open('GET', uri);
	    client.onreadystatechange = function() {
	      if(client.readyState==4){
	    	  evalScript(client.responseText);
	    	  client.onreadystatechange = null;
	    	  onComplete();
	      }
	    };
	    updateProgressState(index);
	    client.send();
	};
}

var isExportReady = false;
function setProgressState(ready, stateLabel, value, max){
	isExportReady = ready;
	if(hasDocument)exportButton.prop('disabled', !isExportReady);
	if(hasPreview)previewReloadButton.prop('disabled', !isExportReady);
	progLabel.text(stateLabel);
	progBar.progressbar( "option", "value", value );
	progBar.progressbar( "option", "max", max );
}
function updateProgressState(value){
	progBar.progressbar( "value", value );
}

function onLoopChanged(e){
	
	if(loopCheckbox.prop('checked')){
		if(hasDocument)loopTweensCheckbox.prop('disabled', false);
	}else{
		loopTweensCheckbox.prop('checked', false);
		loopTweensCheckbox.prop('disabled', true);
		loopTweensCheckbox.change();
	}
}
function onOutputChanged(e){
	animationWarning.css("display", outputType.val()!="animation" ? "" : "none");
}
function onFramesChanged(e){
	frameRange.css("display", frameSelect.val()=="custom" ? "" : "none");
}
function roundTo(num, points){
	var pow = Math.pow(10, points);
	return Math.round(num * pow) / pow;
}
var exampleNumbers = [-69.15189385747, -70.6588152713, 242.418285734, 243.0512827545];
function onPrecisionChanged(e){
	var points = decimalInput.val();
	var numberStrings = "";
	for(var i=0; i<exampleNumbers.length; ++i){
		if(numberStrings.length)numberStrings += " ";
		numberStrings += roundTo(exampleNumbers[i], points);
	}
	decimalInputHint.text('Eg: viewBox="'+numberStrings+'"');
}

function onAutoSaveChanged(){
	var autoSave = autoSaveSetting.prop("checked");
	if(!autoSave)return;
	var settings = this.settings.stringify();
	if(timelineSettingsStr){
		if(timelineSettingsStr==settings){
			return;
			
		}else if(confirm("Timeline already has settings, overwrite?\nClick yes to save current settings to this timeline, click No to load settings from this timeline.")){
			doSaveSettings();
		}else{
			doLoadSettings();
		}
	}
}

function doExport(){
	if(this.baseSettings.getProp(AUTO_SAVE_TIMELINE)){
		// If settings haven't been modified while in the timeline but autosave is on we should save now
		doSaveSettings();
	}
	var settings = this.settings.stringify({file:fileNameInput.attr("placeholder")});
	evalScript('extensible.que.push( extensible.SVG.inst = new extensible.SVG('+settings+'))');
	setProgressState(false, "Exporting", false, 0);
	setProcessing(true);
}

var intervalID = -1;
var isProcessing = false;
function setProcessing(processing){
	if(isProcessing == processing)return;
	isProcessing = processing;
	
	if(intervalID!=-1){
		clearTimeout(intervalID);
	}
	if(isProcessing)processQue();
}
var pendingProcess;
function processQue(){
	if(pendingProcess)return;
	pendingProcess = true;
	evalScript('extensible.que.processFor(80)',
			function(res) {
				pendingProcess = false;
				if(res=="false"){
					loadLastExport();
				}else{
					intervalID = setTimeout(processQue, 20);
				}
			}
	);
}

function loadLastExport(){
	evalScript('extensible.SVG.inst.getExportedPaths()',
			function(res) {
				exportedPaths = JSON.parse(res.split("\\").join("\\\\"));
				hasPreview = (exportedPaths && exportedPaths.length);
				firstExportUri = hasPreview ? exportedPaths[0].uri : null;

				var embedImages = this.settings.getProp(EMBED_IMAGES);
				var embedAudio = this.settings.getProp(EMBED_AUDIO);
				if(embedImages || embedAudio){
					embedAssets(embedImages, embedAudio);
				}
				finishExport();
			}
	);
}

function embedAssets(doImages, doAudio){
	for(var x=0; x<exportedPaths.length; x++){
		var path = exportedPaths[x].path;
		var dir;
		if(unixFS){
			dir = path.substring(0, path.lastIndexOf("/")+1);
		}else{
			dir = path.substring(0, path.lastIndexOf("\\")+1);
		}
		var result = window.cep.fs.readFile(path);
		if (result.err == 0) {
			var data = result.data;
			var xml = $($.parseXML( data ));
			var tags = (doImages ? (doAudio ? "image audio" : "image") : "audio");
			var assetNodes = xml.find(tags);
			var changed = false;
			var done = {};
			for(var i=0; i<assetNodes.length; i++){
				var node = $(assetNodes[i]);
				var relative = node.attr("xlink:href");
				if(!relative){
					relative = node.find("source").attr("src");
				}
				if(done[relative])continue;
				done[relative] = true;

				var correctedRel = relative;
				if(!unixFS)correctedRel = correctedRel.split("/").join("\\");

				var assetPath = dir + correctedRel;

				var b64 = window.cep.fs.readFile(assetPath, window.cep.encoding.Base64);
				if (0 == b64.err && b64.data.length > 1) {
					evalScript('fl.trace( "Embed: '+relative+'  -  '+b64.data.length+'")');
					var b64Data = b64.data.split("\n").join("");
					var mimetype = node.attr("type");
					if(!mimetype){
						mimetype = node.find("source").attr("type");
					}
					if(mimetype==null){
						switch(node.prop("tagName")){
							case "image" :
								mimetype = "image/png";
								break;
							case "audio" :
								mimetype = "audio/mpeg";
								break;
						}
					}
					data = data.split(relative).join("data:"+mimetype+";base64,"+b64Data);
					changed = true;
				}else {
					evalScript('fl.trace( "Failed to load asset for embedding: '+assetPath+'")');
				}
			}
			if(changed){
				var writeRes = window.cep.fs.writeFile(path, data);
				if (writeRes.err == 0) {
					// yay
				}
				else {
					evalScript('fl.trace( "Failed to write SVG for embedding: '+path+'")');
				}
			}
		}else {
			evalScript('fl.trace( "Failed to load SVG for embedding")');
		}
	}
}

function finishExport(){
	loadPreviewData();
	setProgressState(true, "", 0, 0);
	setProcessing(false);
}

/** Loads the last export into the preview panel **/
var hasPreview;
var exportedPaths;
var firstExportUri;
function loadPreviewData(){

	previewFrame.attr("src", firstExportUri);
	previewReloadButton.prop('disabled', !isExportReady && hasPreview);

	if(hasPreview){
		previewFilename.text(firstExportUri.substring(firstExportUri.lastIndexOf('/')+1));
	}else{
		previewFilename.text("");
	}
}

var platform = navigator.platform.toLowerCase();
var unixFS = (platform.indexOf("win")==-1);
//var openCommand = (platform.indexOf("mac")!=-1 ? "open" : (platform.indexOf("win")!=-1 ? "explorer" : "gnome-open"));

function doOpenExport(){
	if(!hasPreview)return;
	alert(CSLibrary.openURLInDefaultBrowser);
	window.cep.util.openURLInDefaultBrowser(firstExportUri);
}
function doReloadPreview(){
	loadPreviewData();
}


/**
 * Update the theme with the AppSkinInfo retrieved from the host product.
 */
var isDark = true;
var brightnessStyleId = "brightnessStyle";
function updateThemeWithAppSkinInfo(appSkinInfo) {
	
    //Update the background color of the panel
    var panelBackgroundColor = appSkinInfo.panelBackgroundColor.color;
    document.body.bgColor = toHex(panelBackgroundColor);
    
    var brightness = ((panelBackgroundColor.red + panelBackgroundColor.green + panelBackgroundColor.blue) / 3) / 0xff;
    
    var shouldBeDark = brightness < 0.5;
    if(isDark!=shouldBeDark){
    	isDark = shouldBeDark;
    	$('#'+brightnessStyleId).remove();
    	$('head').append('<link href="./css/flash-cc-'+(isDark?'dark':'light')+'.css" type="text/css" rel="stylesheet" id="'+brightnessStyleId+'" />');
    }
}

/**
 * Convert the Color object to string in hexadecimal format;
 */
function toHex(color, delta) {
    function computeValue(value, delta) {
        var computedValue = !isNaN(delta) ? value + delta : value;
        if (computedValue < 0) {
            computedValue = 0;
        } else if (computedValue > 255) {
            computedValue = 255;
        } else {
        	computedValue = Math.round(computedValue);
        }

        computedValue = computedValue.toString(16);
        return computedValue.length == 1 ? "0" + computedValue : computedValue;
    }

    var hex = "";
    if (color) {
        with (color) {
             hex = computeValue(red, delta) + computeValue(green, delta) + computeValue(blue, delta);
        };
    }
    return "#" + hex;
}
function checkSaveLoadButtons(){
	var settings = this.settings.stringify();
	if(hasDocument){
		loadSettingsButton.prop("disabled", timelineSettingsStr==null || timelineSettingsStr==settings);
		saveSettingsButton.prop("disabled", settings==null || timelineSettingsStr==settings);
	}
}
function doSaveSettings(){
	var settings = this.settings.stringify();
	evalScript("extensible.saveTimelineSettings('svgPanel', '"+settings+"')",
		function(res) {
			timelineSettingsStr = settings;
			checkSaveLoadButtons();
		}
	);
}

function doLoadSettings(onComplete){
	evalScript("extensible.loadTimelineSettings('svgPanel')",
		function(res) {
			timelineSettingsStr = res;
			checkSaveLoadButtons();
			
			if(this.baseSettings.getProp(AUTO_SAVE_TIMELINE)){
				if(res)this.settings.fill(res);
			}
			if(onComplete)onComplete();
		}
	);
}


function doShowSavePanel(e){
	if(e && e.ctrlKey){
		window.location.reload();
		return;
	}
	if(savePresetPanel.is(":visible") ){
		doCancelPreset();
		return;
	}
	savePresetName.val("");
	saveSourceSettings.prop("checked", true);
	saveOutputSettings.prop("checked", true);
	saveRootSettings.prop("checked", true);
	saveGraphicsSettings.prop("checked", true);
	saveAnimationSettings.prop("checked", true);
	
	savePresetPanel.slideDown('fast');
}
function doCancelPreset(){
	savePresetPanel.slideUp('fast');
}
function doSavePreset(){
	
	var name = savePresetName.val();
	if(!name){
		alert("Please select a name for this preset.");
		return;
	}
	if(this.presets && this.presets.indexOf(name)!=-1 && !confirm("Preset with name '"+name+"' already exists.\nOverwrite?")){
		return;
	}

	var source = saveSourceSettings.prop("checked");
	var output = saveOutputSettings.prop("checked");
	var root = saveRootSettings.prop("checked");
	var graphics = saveGraphicsSettings.prop("checked");
	var animation = saveAnimationSettings.prop("checked");
	
	var props = [];
	if(source){
		props.push(SOURCE);
		props.push(FRAMES);
	}
	if(output){
		props.push(OUTPUT);
		props.push(FILE);
		props.push(PRECISION);
		props.push(EXPAND_SYMBOLS);
		props.push(REMOVE_GROUPS);
		props.push(COMPACT_OUTPUT);
		props.push(AVOID_MITER);
	}
	if(root){
		props.push(RENDERING);
		props.push(ROOT_SCALING);
	}
	if(graphics){
		props.push(MASKING_TYPE);
		props.push(CURVE_DEGREE);
		props.push(CONVERT_PATTERNS);
		props.push(INCLUDE_BG);
		props.push(CONVERT_TEXT_TO_OUTLINES);
		props.push(EMBED_IMAGES);
	}
	if(animation){
		props.push(TWEEN_TYPE);
		props.push(LOOP);
		props.push(LOOP_TWEENS);
		props.push(BEGIN_ANIMATION);
	}
	var settings = this.settings.stringify(null, props);
	evalScript("extensible.saveAppSettings('"+name+"', '"+presetsDir+"', '"+settings+"')",
		function(res) {
			loadPresets();
		}
	);
	doCancelPreset();
}

function onPresetSelected(){
	var preset = presetSelect.prop('selectedIndex');
	preset = this.presets[preset - 1];
	evalScript("extensible.loadAppSettings('"+preset+"', '"+presetsDir+"')",
		function(res) {
			if(res)this.settings.fill(res);
		}
	);
	
	presetSelect.prop('selectedIndex', 0);
}

function onSourceTimelineChanged(){
	if(this.settings.getProp(SOURCE)=="current"){
		fileNameLabel.text("Output File:");
	}else{
		fileNameLabel.text("Output Folder:");
	}
	checkDefaultName();
}


function checkDefaultName(){
	if(isProcessing || !this.settings)return;
	if(this.settings.getProp(SOURCE)=="current"){
		evalScript("extensible.getDefaultTimelineFileName()",
				function(res) {
					fileNameInput.attr("placeholder", res);
				}
			);
	}else{
		evalScript("extensible.getDefaultFolderName()",
				function(res) {
					fileNameInput.attr("placeholder", res);
				}
			);
	}
}

function onTimelineChanged(event){
	if(isProcessing || !this.settings)return;
	doLoadSettings();
	if(this.settings.getProp(SOURCE)=="current"){
		checkDefaultName();
	}
}
var hasDocument;
function onDocumentChanged(event){
	evalScript("fl.getDocumentDOM()",
		function(res) {
			hasDocument = (res!=null);
			exportButton.prop('disabled', !hasDocument || !isExportReady);
			setInputsActive(hasDocument);
		}
	);
}
function setInputsActive(active){
	inputs.each(function(index){
		var $this = $(this);
		$this.prop('disabled', !active);
	});
	onLoopChanged();
	if(this.settings)checkSaveLoadButtons();
}

function onAppThemeColorChanged(event) {
    // Should get a latest HostEnvironment object from application.
    var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
    // Gets the style information such as color info from the skinInfo, 
    // and redraw all UI controls of your extension according to the style info.
    updateThemeWithAppSkinInfo(skinInfo);
}



function evalScript(script, callback) {
	csInterface.evalScript(script, function(res){
		if(callback){
			switch(res){
				case "EvalScript error.":
				case "undefined":
				case "null":
					res = null;
			}
			callback(res);
		}
	});
}
