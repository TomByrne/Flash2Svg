(function(ext){
	function ProgressBar(swfPanel,options){
		var settings=new ext.Object({
			increment:1,
			max:100,
			percentComplete:0,
			isCanceled:false	
		});
		settings.extend(options);
		ext.Object.apply(settings);
		for(var i=0;i<fl.swfPanels.length;i++){
			if(fl.swfPanels[i].name==swfPanel){
				this.swfPanel=fl.swfPanels[i];
			}
		}
		return this;
	}
	ProgressBar.prototype={
		__proto__:ext.Object.prototype,
		type:ProgressBar,
		name:'ProgressBar',
		setProgress:function(percentComplete){
			this.percentComplete=percentComplete;
			this.swfPanel.call('setProgress',percentComplete);
		},
		progress:function(){
			if(this.isCanceled){
				throw new Error('Operation canceled by user.');
			}else{
				this.setProgress(
					this.percentComplete+(this.increment/this.max)*100
				);
			}		
		}
	};
	ext.extend({ProgressBar:ProgressBar});
})(extensible);
