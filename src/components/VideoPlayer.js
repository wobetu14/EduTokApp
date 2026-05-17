import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const buildHtml = (youtubeId, autoplay) => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;background:#000;box-sizing:border-box;}
html,body{width:100%;height:100vh;overflow:hidden;}
#player,#player iframe{width:100%!important;height:100%!important;border:none!important;}
</style>
</head>
<body>
<div id="player"></div>
<script>
var tag=document.createElement('script');
tag.src='https://www.youtube.com/iframe_api';
document.head.appendChild(tag);
var player;
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    videoId:'${youtubeId}',
    playerVars:{autoplay:${autoplay ? 1 : 0},playsinline:1,rel:0,modestbranding:1},
    events:{
      onReady:function(e){
        if(${autoplay ? 'true' : 'false'})e.target.playVideo();
        setInterval(function(){
          try{
            var t=player.getCurrentTime(),d=player.getDuration();
            if(d>0)window.ReactNativeWebView.postMessage(JSON.stringify({t:t,d:d}));
          }catch(err){}
        },500);
      }
    }
  });
}
</script>
</body>
</html>`;

const VideoPlayer = ({ youtubeId, active, onProgress }) => {
  const webViewRef = useRef(null);

  useEffect(() => {
    if (!webViewRef.current) return;
    const js = active
      ? `try{if(player&&player.playVideo)player.playVideo();}catch(e){} true;`
      : `try{if(player&&player.pauseVideo)player.pauseVideo();}catch(e){} true;`;
    webViewRef.current.injectJavaScript(js);
  }, [active]);

  const handleMessage = (event) => {
    try {
      const { t, d } = JSON.parse(event.nativeEvent.data);
      if (d > 0) onProgress?.(t / d);
    } catch (_) {}
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webViewRef}
        source={{ html: buildHtml(youtubeId, active) }}
        style={styles.webview}
        onMessage={handleMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default VideoPlayer;
