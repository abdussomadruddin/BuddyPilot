import whisper,json
m=whisper.load_model('medium')
r=m.transcribe('a0848.wav',language='ms',fp16=False,word_timestamps=True,initial_prompt='Honda City, rebate, trade-in, ringgit, warranty, hybrid, dashcam, tinted, service voucher.')
W=[(w['start'],w['end'],w['word']) for s in r['segments'] for w in s['words']]
json.dump(W,open('words.json','w'))
for i,(a,b,t) in enumerate(W): print(i,f"{a:.2f}",f"{b:.2f}",t)
