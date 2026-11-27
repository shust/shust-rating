(function(W){
  'use strict';
  W.WatchSyncHelperBridge=function(options,open,context,args){
    var done=false,timer=null;
    function go(){if(done)return;done=true;if(timer)clearTimeout(timer);open.apply(context,args);}
    try{
      var code=String(options.code||''), data=args[1], card=data&&options.card(data), identity=data&&options.resolve(data,card), playback=data&&options.playback(data), labels=[];
      if(!/^[A-Za-z0-9_-]{32}$/.test(code)||!identity||!playback||playback.kind!=='torrent'||!playback.hash||playback.fileIndex===undefined||!options.connection||!options.connection.token||!options.request)return go();
      [data.path_human,data.path,data.title].forEach(function(x){if(typeof x==='string'&&x.length&&labels.indexOf(x)<0&&labels.length<3)labels.push(x.slice(0,300));});
      if(identity.type==='movie'&&identity.title&&labels.indexOf(identity.title)<0)labels.push(identity.title.slice(0,240));
      if(!labels.length)return go();
      var payload={pair:code,key:identity.key,title:identity.title||'',hash:playback.hash,fileIndex:playback.fileIndex,server:options.connection.server,token:options.connection.token,expectedLabel:labels.join('\n'),historyRevision:options.historyRevision(identity.key)};
      timer=setTimeout(go,1200);
      var req=options.request();req.timeout(900);req.native('http://127.0.0.1:18961/arm',go,go,JSON.stringify(payload),{type:'POST',dataType:'json',contentType:'application/json'});
    }catch(ignore){go();}
  };
})(typeof window!=='undefined'?window:this);

(function(W){
  'use strict';
  if(W.watchSyncVimuOverlayInstalled)return;
  W.watchSyncVimuOverlayInstalled=true;
  var retries=0;
  function init(){
    if(typeof Lampa!=='undefined' && Lampa.Platform && Lampa.Platform.is && !Lampa.Platform.is('android'))return;
    if(!W.watchSyncInstalled||!W.WatchSyncCore||typeof Lampa==='undefined'||!Lampa.Android||typeof Lampa.Android.openPlayer!=='function'||!Lampa.SettingsApi){if(++retries<60)setTimeout(init,1000);return;}
    var core=W.WatchSyncCore,previous=Lampa.Android.openPlayer;
    if(!previous.watchSyncVimuOverlay){
      var wrapped=function(){
        var data=arguments[1],connection=Lampa.Storage.get('watch_sync_connection',{}),enabled=Lampa.Storage.get('watch_sync_enabled',true);
        if(enabled===false||enabled==='false'||!connection||!connection.user||!connection.user.id||!connection.token)return previous.apply(this,arguments);
        return W.WatchSyncHelperBridge({
          code:Lampa.Storage.get('watch_sync_vimu_pair',''),connection:connection,
          card:function(item){var activity=Lampa.Activity.active()||{};return item.card||item.movie||activity.movie||activity.card||null;},
          resolve:function(item,card){return core.resolve(item,card,Lampa.Utils.hash);},
          playback:function(item){return core.playbackFor(item);},
          historyRevision:function(key){
            var db=Lampa.Storage.get('watch_sync_data_v1_'+encodeURIComponent(connection.server)+'_'+connection.user.id,{}),base=key.split(':').slice(0,3).join(':'),control=db.controls&&db.controls[base],action=db.actions&&db.actions[base];
            return Math.max(control?Number(control.revision)||0:0,action?(Number(action.historyRevision)||0)+1:0);
          },
          request:function(){return new Lampa.Reguest();}
        },previous,this,arguments);
      };
      wrapped.watchSyncVimuOverlay=true;Lampa.Android.openPlayer=wrapped;
    }
    Lampa.SettingsApi.addParam({component:'watch_sync',param:{name:'watch_sync_vimu_pair',type:'button'},field:{name:'Подключить помощник Vimu',description:'Введи код сопряжения из приложения на этом телевизоре.'},onChange:function(){
      Lampa.Input.edit({title:'Код помощника Vimu',value:String(Lampa.Storage.get('watch_sync_vimu_pair','')),free:true,nosave:true},function(code){code=String(code||'').trim();if(code&&!/^[A-Za-z0-9_-]{32}$/.test(code))return Lampa.Noty.show('Синхронизация тайм-кодов: неверный код помощника Vimu');Lampa.Storage.set('watch_sync_vimu_pair',code);Lampa.Noty.show('Синхронизация тайм-кодов: '+(code?'помощник Vimu подключён':'помощник Vimu отключён'));});
    }});
  }
  if(W.appready)setTimeout(init,3000);else Lampa.Listener.follow('app',function(e){if(e.type==='ready')setTimeout(init,3000);});
})(typeof window!=='undefined'?window:this);
