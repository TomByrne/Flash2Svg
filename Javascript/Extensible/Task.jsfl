(function(ext){
	/**
	 * An abstract base class for tasks processed in an [extensible.Que].
	 * @this {extensible.Task}
	 * @extends extensible.Object
	 * @constructor
	 * @param {Object} options
	 */
	function Task(options){
		var settings=new ext.Object({
			qData:new ext.Array([]),
			qID:null, // set on addition to a que
			que:null // set on addition to a que
		});
		settings.extend(options);
		ext.Object.apply(this,[settings]);
		return this;
	}
	Task.prototype={
		__proto__:ext.Object,
		type:Task,
		/**
		 * Initiates processing.
		 */
		begin:function(){
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='begin';
				return;
			}
			/* add qData here */
			this.process();
		},
		/**
		 * 
		 */
		process:function(){
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='process';
				return true;
			}
			if(qData.length){
				/* processing instructions */
				qData.shift();	
				return true;
			}else{
				this.end();	
				return false;
			}
		},
		/**
		 * 
		 */
		end:function(){
			if(this.que && this.que.isPaused){
				this.que.resumeCmd='end';
				return;
			}
			/* finish */
			/*if(this.qID){
				this.que.next();
			}*/
		}
	};
	ext.extend({Task:Task});
})(extensible)