
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { createClient } from '@supabase/supabase-js';
import { firebaseConfig, supabaseConfig, storeAdminEmail } from './config.js';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const STORE_WA = '254180752220';
const STORE_TILL = '6817863';
const STORE_BINANCE_PAY_ID = '1236166874';
const STORE_ADMIN = (storeAdminEmail || 'enemindcompany@gmail.com').toLowerCase();
const DEFAULT_PRODUCT_IMAGE = new URL('./icons/logo.jpg', import.meta.url).href;
const PRODUCT_IMAGE_BUCKET = 'store-product-images';
const YOUTUBE_TABLE = 'store_youtube_videos';
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const app = initializeApp(firebaseConfig, 'enemind-storefront');
const auth = getAuth(app);
let firebaseUser = null;
const sb = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  accessToken: async () => firebaseUser ? await firebaseUser.getIdToken() : null
});
const $ = (id) => document.getElementById(id);
const storeState = { products: [], order: null, filter: '', search: '', curriculum: '', classLevel: '', subject: '', career: '' };
const money = (amount, currency='KES') => new Intl.NumberFormat('en-KE',{style:'currency',currency,maximumFractionDigits:2}).format(Number(amount||0));
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setStatus = (id, text, error=false) => { const el=$(id); if(el){el.textContent=text;el.style.color=error?'#ffaaa9':'';} };
const openModal = id => { $(id).hidden=false; document.body.style.overflow='hidden'; };
const closeModal = id => { $(id).hidden=true; document.body.style.overflow=''; };
const publicBaseUrl = () => window.location.href.split('#')[0].split('?')[0];
function productUrl(product){ return publicBaseUrl()+'?product='+encodeURIComponent(product.slug || product.id); }
function productShareText(p){return `${p.title} — ${money(p.price,p.currency||'KES')}\n${p.short_description||p.description||'Digital learning resource from Enemind.'}\nView details: ${productUrl(p)}`;}
function shareButtons(p){const text=productShareText(p);const wa='https://wa.me/?text='+encodeURIComponent(text);const fb='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(productUrl(p));return `<button class="store-share" type="button" data-share-wa="${esc(p.id)}">WhatsApp</button><button class="store-share" type="button" data-share-fb="${esc(p.id)}">Facebook</button><button class="store-share" type="button" data-marketplace="${esc(p.id)}">Marketplace guide</button>`;}
function renderProducts(){
 const q=storeState.search.trim().toLowerCase(), cat=storeState.filter;
 const items=storeState.products.filter(p=>{const text=`${p.title} ${p.description||''} ${p.short_description||''} ${p.category||''} ${p.audience||''} ${p.curriculum||''} ${p.class_level||''} ${p.subject||''} ${p.career_area||''}`.toLowerCase();return (!cat||p.category===cat)&&(!storeState.curriculum||p.curriculum===storeState.curriculum||(!p.curriculum&&text.includes(storeState.curriculum)))&&(!storeState.classLevel||p.class_level===storeState.classLevel||(!p.class_level&&text.includes(storeState.classLevel.replace(/-/g,' '))) )&&(!storeState.subject||p.subject===storeState.subject||text.includes(storeState.subject.replace(/-/g,' ')))&&(!storeState.career||(p.career_area===storeState.career||text.includes(storeState.career.replace(/-/g,' '))))&&(!q||text.includes(q));});
 $('storeProducts').innerHTML=items.length?items.map(p=>`<article class="store-card" id="product-${esc(p.slug||p.id)}" data-product-card="${esc(p.id)}"><div class="store-card-image"><img loading="lazy" src="${esc(p.preview_image_url||DEFAULT_PRODUCT_IMAGE)}" alt="${esc(p.title)} preview" onerror="this.onerror=null;this.src='${esc(DEFAULT_PRODUCT_IMAGE)}'"></div><div class="store-card-body"><span class="store-tag">${esc((p.category||'resource').replace(/-/g,' '))}${p.audience?' · '+esc(p.audience):''}</span><h3>${esc(p.title)}</h3><p>${esc(p.short_description||p.description||'Digital resource. Contact Enemind for details.')}</p>${p.preview_url?`<a class="store-share" href="${esc(p.preview_url)}" target="_blank" rel="noopener">View free preview</a>`:''}<div class="store-price">${money(p.price,p.currency||'KES')} <small>${p.license_type==='school'?'school licence':'digital product'}</small></div><div class="store-card-actions"><button class="store-button" type="button" data-buy="${esc(p.id)}">Buy now</button>${shareButtons(p)}</div></div></article>`).join(''):'<div class="store-empty"><div class="empty-icon" aria-hidden="true">⌕</div><h3>No resources found just yet</h3><p>Try another search or category. New learning resources will appear here as soon as they are published.</p><a href="https://wa.me/254180752220?text=Hello%20Enemind%2C%20please%20help%20me%20find%20learning%20resources." target="_blank" rel="noopener">Ask Enemind on WhatsApp</a></div>';
 $('storeStatus').textContent=`${items.length} published resource${items.length===1?'':'s'} · Browse without signing in`;
}
async function loadProducts(){
 const timeoutMs = 12000;
 const controller = new AbortController();
 const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
 setStatus('storeStatus','Connecting to the catalogue…');
 const productsEl = $('storeProducts');
 if (productsEl) productsEl.innerHTML = '<article class="store-empty">Connecting to the catalogue…</article>';
 try {
  const {data,error}=await sb.from('store_products')
   .select('id,slug,title,short_description,description,category,audience,curriculum,class_level,subject,career_area,price,currency,preview_image_url,preview_url,license_type')
   .eq('status','published')
   .order('featured',{ascending:false})
   .order('created_at',{ascending:false})
   .abortSignal(controller.signal);
  if(error) throw error;
  storeState.products=data||[];
  renderProducts();
  if (!storeState.products.length) {
   setStatus('storeStatus','No published resources are available yet. Please check back soon or ask Enemind on WhatsApp.');
  }
  const slug=new URLSearchParams(location.search).get('product');
  if(slug){const found=storeState.products.find(p=>p.slug===slug||p.id===slug);if(found){document.getElementById('product-'+(found.slug||found.id))?.scrollIntoView({behavior:'smooth',block:'center'});}}
 } catch(error) {
  storeState.products=[];
  renderProducts();
  const timedOut = error?.name === 'AbortError' || controller.signal.aborted;
  const detail = error?.message ? ` Details: ${error.message}` : '';
  setStatus('storeStatus', timedOut
   ? `The catalogue server did not respond within ${timeoutMs/1000} seconds. Check that Supabase is online and that its URL/key in config.js are correct. Also verify the public SELECT policy allows published rows in store_products.`
   : `The catalogue could not load. Check the Supabase project URL/key in config.js and the public SELECT policy for published store_products.${detail}`, true);
  console.error('[Enemind Store] Catalogue load failed:', error);
 } finally {
  window.clearTimeout(timeoutId);
 }
}
function startCheckout(id){
 const p=storeState.products.find(x=>x.id===id);if(!p)return;
 const details=[
  `Hello Enemind, I would like to order this resource:`,
  `Product: ${p.title}`,
  `Product ID: ${p.id}`,
  `Price shown: ${money(p.price,p.currency||'KES')}`,
  `Licence: ${p.license_type||'digital product'}`,
  `Description: ${p.short_description||p.description||'Digital learning resource'}`,
  'Quantity requested: 1',
  `Category: ${(p.category||'resource').replace(/-/g,' ')}`,
  p.audience?`Audience: ${p.audience}`:'',
  p.curriculum?`Curriculum: ${p.curriculum.toUpperCase()}`:'',
  p.class_level?`Class / level: ${p.class_level.replace(/-/g,' ')}`:'',
  p.subject?`Subject: ${p.subject.replace(/-/g,' ')}`:'',
  `Product link: ${productUrl(p)}`,
  '',
  'Please confirm the total price and send me the payment instructions here on WhatsApp.',
  'My name: ',
  'Preferred delivery (WhatsApp / email if applicable): '
 ].filter(Boolean).join('\n');
 const url='https://wa.me/'+STORE_WA+'?text='+encodeURIComponent(details);
 window.open(url,'_blank','noopener,noreferrer');
}
async function submitSchoolQuote(e){
 e.preventDefault();setStatus('quoteStatus','Sending request…');
 try{const {error}=await sb.rpc('store_submit_school_quote',{p_school_name:$('quoteSchool').value.trim(),p_contact_name:$('quoteContact').value.trim(),p_phone:$('quotePhone').value.trim(),p_email:$('quoteEmail').value.trim()||null,p_needs:$('quoteNeeds').value.trim()});if(error)throw error;$('schoolQuoteForm').reset();setStatus('quoteStatus','Request received. Enemind will contact you using the details provided.');}
 catch(err){setStatus('quoteStatus',err.message||'Could not send request. Please use WhatsApp support.',true);}
}
function openMarketplaceGuide(p){
 const text=`Hello Enemind, I want to promote this resource on Facebook where eligible:\n${p.title}\nPrice: ${money(p.price,p.currency||'KES')}\n${productUrl(p)}`;
 const url='https://wa.me/'+STORE_WA+'?text='+encodeURIComponent(text);
 window.open(url,'_blank','noopener');
 alert('Facebook sharing opens a public product link. Facebook Marketplace eligibility depends on Meta policies and category rules; digital downloads may not be eligible. The next step opens WhatsApp for help with compliant promotion. No Marketplace post is published automatically.');
}
document.addEventListener('click',e=>{
 const buy=e.target.closest('[data-buy]');if(buy){startCheckout(buy.dataset.buy);return;}
 const wa=e.target.closest('[data-share-wa]');if(wa){const p=storeState.products.find(x=>x.id===wa.dataset.shareWa);if(p)window.open('https://wa.me/?text='+encodeURIComponent(productShareText(p)),'_blank','noopener');return;}
 const fb=e.target.closest('[data-share-fb]');if(fb){const p=storeState.products.find(x=>x.id===fb.dataset.shareFb);if(p)window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(productUrl(p)),'_blank','noopener');return;}
 const market=e.target.closest('[data-marketplace]');if(market){const p=storeState.products.find(x=>x.id===market.dataset.marketplace);if(p)openMarketplaceGuide(p);return;}
 const editVideo=e.target.closest('[data-edit-youtube]');if(editVideo){editYoutubeVideo(editVideo.dataset.editYoutube);return;}
 const toggleVideo=e.target.closest('[data-toggle-youtube]');if(toggleVideo){toggleYoutubeVideo(toggleVideo.dataset.toggleYoutube,toggleVideo.dataset.nextStatus);return;}
 const deleteVideo=e.target.closest('[data-delete-youtube]');if(deleteVideo){deleteYoutubeVideo(deleteVideo.dataset.deleteYoutube);return;}
});
$('storeSearch').addEventListener('input',e=>{storeState.search=e.target.value;renderProducts();});
$('storeCategory').addEventListener('change',e=>{storeState.filter=e.target.value;renderProducts();});
$('storeCurriculum').addEventListener('change',e=>{storeState.curriculum=e.target.value;renderProducts();});
$('storeClass').addEventListener('change',e=>{storeState.classLevel=e.target.value;renderProducts();});
$('storeSubject').addEventListener('change',e=>{storeState.subject=e.target.value;renderProducts();});
$('storeCareer').addEventListener('change',e=>{storeState.career=e.target.value;renderProducts();});
$('videoLearningForm').addEventListener('submit',e=>{
 e.preventDefault();
 const topic=$('videoTopic').value.trim();
 if(!topic)return;
 const curriculum=$('storeCurriculum').value;
 const level=$('storeClass').value;
 const subject=$('storeSubject').value;
 const context=[topic,subject&&subject!=='all-subjects'?subject.replace(/-/g,' '):'',level?level.replace(/-/g,' '):'',curriculum==='cbc'?'CBC CBE':curriculum==='844'?'8-4-4':''].filter(Boolean).join(' ');
 const url='https://www.youtube.com/results?search_query='+encodeURIComponent(context+' lesson');
 window.open(url,'_blank','noopener,noreferrer');
});
$('schoolQuoteOpen').addEventListener('click',()=>openModal('schoolQuoteModal'));
$('schoolQuoteForm').addEventListener('submit',submitSchoolQuote);
$('quoteClose').addEventListener('click',()=>closeModal('schoolQuoteModal'));
$('schoolQuoteModal').addEventListener('click',e=>{if(e.target.id==='schoolQuoteModal')closeModal('schoolQuoteModal');});
$('adminRefreshOrders').addEventListener('click',loadAdminQueue);
$('adminYoutubeForm').addEventListener('submit',saveYoutubeVideo);
$('adminYoutubeCancel').addEventListener('click',()=>resetYoutubeForm());
function normaliseYoutubeUrl(raw){
 try{const u=new URL(raw);if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube.com'].includes(u.hostname))return null;let id='';if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(u.pathname==='/watch')id=u.searchParams.get('v')||'';else if(/^\/(embed|shorts)\//.test(u.pathname))id=u.pathname.split('/')[2]||'';if(!/^[A-Za-z0-9_-]{6,}$/.test(id))return null;return 'https://www.youtube.com/watch?v='+id;}catch{return null;}
}
async function loadCuratedYoutubeVideos(){
 const target=$('curatedYoutubeVideos');if(!target)return;
 const {data,error}=await sb.from(YOUTUBE_TABLE).select('id,title,video_url,topic,description').eq('status','published').order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(12);
 if(error){target.innerHTML='';return;}
 target.innerHTML=(data||[]).map(v=>`<article class="curated-video"><strong>${esc(v.title)}</strong>${v.topic?`<p>${esc(v.topic)}</p>`:''}${v.description?`<p>${esc(v.description)}</p>`:''}<a href="${esc(normaliseYoutubeUrl(v.video_url)||'https://www.youtube.com') }" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></article>`).join('');
}
async function loadAdminYoutubeVideos(){
 const target=$('adminYoutubeList');if(!target||!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)return;
 const {data,error}=await sb.from(YOUTUBE_TABLE).select('*').order('created_at',{ascending:false}).limit(200);
 if(error){target.textContent='Unable to load YouTube videos: '+error.message;return;}
 target.innerHTML=(data||[]).map(v=>`<article class="admin-product-row"><div><strong>${esc(v.title)}</strong><p>${esc(v.topic||'General')} · ${esc(v.status)}</p><a href="${esc(normaliseYoutubeUrl(v.video_url)||'https://www.youtube.com')}" target="_blank" rel="noopener noreferrer">Open video</a></div><div class="admin-product-actions"><button type="button" class="store-share" data-edit-youtube="${esc(v.id)}">Edit</button><button type="button" class="store-share" data-toggle-youtube="${esc(v.id)}" data-next-status="${v.status==='published'?'draft':'published'}">${v.status==='published'?'Unpublish':'Publish'}</button><button type="button" class="store-share" data-delete-youtube="${esc(v.id)}">Delete</button></div></article>`).join('')||'<p>No videos added yet.</p>';
}
function resetYoutubeForm(){ $('adminYoutubeForm').reset();$('adminYoutubeId').value='';$('adminYoutubeSaveButton').textContent='Save video';$('adminYoutubeCancel').hidden=true; }
async function saveYoutubeVideo(e){
 e.preventDefault();if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN){setStatus('adminYoutubeStatusMessage','Admin access required.',true);return;}
 const url=normaliseYoutubeUrl($('adminYoutubeUrl').value.trim());if(!url){setStatus('adminYoutubeStatusMessage','Enter a valid YouTube watch, youtu.be, embed or Shorts URL.',true);return;}
 const id=$('adminYoutubeId').value;const row={title:$('adminYoutubeTitle').value.trim(),video_url:url,topic:$('adminYoutubeTopic').value.trim()||null,description:$('adminYoutubeDescription').value.trim()||null,status:$('adminYoutubeStatus').value,updated_at:new Date().toISOString()};
 setStatus('adminYoutubeStatusMessage','Saving video…');
 try{const result=id?await sb.from(YOUTUBE_TABLE).update(row).eq('id',id):await sb.from(YOUTUBE_TABLE).insert(row);if(result.error)throw result.error;resetYoutubeForm();setStatus('adminYoutubeStatusMessage','YouTube video saved.');await loadAdminYoutubeVideos();await loadCuratedYoutubeVideos();}catch(err){setStatus('adminYoutubeStatusMessage','Could not save video: '+(err.message||'unknown error')+'. Run the latest media/category migration and confirm admin sign-in.',true);}
}
async function editYoutubeVideo(id){const {data,error}=await sb.from(YOUTUBE_TABLE).select('*').eq('id',id).single();if(error||!data){setStatus('adminYoutubeStatusMessage',error?.message||'Could not load video.',true);return;} $('adminYoutubeId').value=data.id;$('adminYoutubeTitle').value=data.title||'';$('adminYoutubeUrl').value=data.video_url||'';$('adminYoutubeTopic').value=data.topic||'';$('adminYoutubeDescription').value=data.description||'';$('adminYoutubeStatus').value=data.status||'draft';$('adminYoutubeSaveButton').textContent='Update video';$('adminYoutubeCancel').hidden=false;$('adminYoutubeDetails').open=true;$('adminYoutubeForm').scrollIntoView({behavior:'smooth',block:'start'});}
async function toggleYoutubeVideo(id,status){try{const {error}=await sb.from(YOUTUBE_TABLE).update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await loadAdminYoutubeVideos();await loadCuratedYoutubeVideos();setStatus('adminYoutubeStatusMessage','Video status updated.');}catch(err){setStatus('adminYoutubeStatusMessage',err.message||'Could not update video.',true);}}
async function deleteYoutubeVideo(id){if(!confirm('Delete this YouTube listing?'))return;try{const {error}=await sb.from(YOUTUBE_TABLE).delete().eq('id',id);if(error)throw error;await loadAdminYoutubeVideos();await loadCuratedYoutubeVideos();setStatus('adminYoutubeStatusMessage','Video listing deleted.');}catch(err){setStatus('adminYoutubeStatusMessage',err.message||'Could not delete video.',true);}}

async function loadAdminQueue(){
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN){$('storeAdminPanel').hidden=true;return;}
 $('storeAdminPanel').hidden=false;setStatus('adminStatus','Loading order queue…');
 const {data,error}=await sb.from('store_orders').select('id,order_reference,buyer_name,buyer_phone,buyer_email,product_title,amount,currency,payment_method,payment_status,payment_reference,status,delivery_method,delivery_status,created_at').order('created_at',{ascending:false}).limit(100);
 if(error){setStatus('adminStatus','Cannot load queue. Ensure the Supabase migrations are applied and Firebase third-party auth is configured.',true);return;}
 $('adminOrderQueue').innerHTML=(data||[]).map(o=>`<article class="admin-order" data-admin-order="${esc(o.id)}" data-payment-status="${esc(o.payment_status)}" data-payment-reference="${esc(o.payment_reference||'')}"><h4>${esc(o.order_reference)} · ${esc(o.product_title)}</h4><p>Buyer: ${esc(o.buyer_name)} · ${esc(o.buyer_phone)} ${o.buyer_email?'· '+esc(o.buyer_email):''}</p><p>Amount: ${money(o.amount,o.currency)} · Method: <strong>${esc((o.payment_method||'not selected').toUpperCase())}</strong> · Transaction reference: <strong>${esc(o.payment_reference||'Not submitted')}</strong></p><p>Payment: ${esc(o.payment_status)} · Order: ${esc(o.status)} · Delivery: ${esc(o.delivery_method)} / ${esc(o.delivery_status)}</p><div class="admin-order-actions"><label>Delivery URL (download only)<input data-delivery-url type="url" placeholder="https://…"></label><button type="button" class="store-button" data-admin-approve="${esc(o.id)}">Verify & approve payment</button><button type="button" class="store-button store-button-secondary" data-admin-download="${esc(o.id)}">Activate download</button><button type="button" class="store-button store-button-secondary" data-admin-whatsapp="${esc(o.id)}">Mark WhatsApp delivered</button><button type="button" class="store-share" data-admin-reject="${esc(o.id)}">Reject payment</button></div></article>`).join('')||'<div class="store-empty">No orders yet.</div>';
 setStatus('adminStatus',`${data?.length||0} recent orders loaded.`);await loadAdminProducts();await loadAdminContributors();await loadAdminQuotes();
}
document.addEventListener('click',async e=>{
 const approve=e.target.closest('[data-admin-approve]'),dl=e.target.closest('[data-admin-download]'),wa=e.target.closest('[data-admin-whatsapp]'),reject=e.target.closest('[data-admin-reject]');
 const btn=approve||dl||wa||reject;if(!btn)return;
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN){setStatus('adminStatus','Admin access required.',true);return;}
 const id=btn.dataset.adminApprove||btn.dataset.adminDownload||btn.dataset.adminWhatsapp||btn.dataset.adminReject;
 if(approve&&(btn.closest('.admin-order')?.dataset.paymentStatus!=='submitted'||!btn.closest('.admin-order')?.dataset.paymentReference)){setStatus('adminStatus','A transaction code must be submitted before you can verify payment.',true);return;}
 if((dl||wa)&&btn.closest('.admin-order')?.dataset.paymentStatus!=='verified'){setStatus('adminStatus','Verify the payment transaction first, then refresh the queue before activating delivery.',true);return;}
 try{
  let updates={};
  if(approve){if(!confirm('Have you independently verified this transaction in the selected payment provider? Only approve after verification.'))return;updates={payment_status:'verified',status:'paid',verified_at:new Date().toISOString(),verified_by:firebaseUser.email};}
  if(dl){const url=btn.closest('.admin-order').querySelector('[data-delivery-url]').value.trim();if(!url||!/^https:\/\//i.test(url)){setStatus('adminStatus','Enter an HTTPS protected file URL before activating download.',true);return;}updates={delivery_method:'download',delivery_status:'ready',delivery_url:url,status:'fulfilled'};}
  if(wa){if(!confirm('Confirm you have actually sent the product to the buyer through WhatsApp?'))return;updates={delivery_method:'whatsapp',delivery_status:'ready',status:'fulfilled',delivery_url:null};}
  if(reject){if(!confirm('Reject this payment submission?'))return;updates={payment_status:'rejected',status:'payment_review'};}
  const {error}=await sb.from('store_orders').update(updates).eq('id',id);if(error)throw error;
  setStatus('adminStatus','Order updated.');await loadAdminQueue();
 }catch(err){setStatus('adminStatus',err.message||'Could not update order.',true);}
});

$('adminProductTitle').addEventListener('input',()=>{if(!$('adminProductSlug').dataset.edited)$('adminProductSlug').value=$('adminProductTitle').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
$('adminProductSlug').addEventListener('input',()=>{$('adminProductSlug').dataset.edited='1';});
function resetAdminProductForm(){
 $('adminProductForm').reset();$('adminProductId').value='';delete $('adminProductSlug').dataset.edited;const imagePreview=$('adminProductImagePreview');if(imagePreview){imagePreview.hidden=true;imagePreview.removeAttribute('src');}
 $('adminProductSaveButton').textContent='Save product';$('adminProductCancelEdit').hidden=true;
}
$('adminProductCancelEdit').addEventListener('click',()=>{resetAdminProductForm();setStatus('adminProductStatusMessage','Edit cancelled.');});
$('adminProductImageFile').addEventListener('change',()=>{
 const file=$('adminProductImageFile').files?.[0], preview=$('adminProductImagePreview');
 if(!file){preview.hidden=true;preview.removeAttribute('src');return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_PRODUCT_IMAGE_BYTES){$('adminProductImageFile').value='';preview.hidden=true;setStatus('adminProductStatusMessage','Choose a JPG, PNG or WebP image no larger than 5 MB.',true);return;}
 preview.src=URL.createObjectURL(file);preview.hidden=false;
});
async function uploadProductImageIfSelected(){
 const file=$('adminProductImageFile').files?.[0];
 if(!file)return $('adminProductImage').value.trim()||DEFAULT_PRODUCT_IMAGE;
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)throw new Error('Admin access required to upload product images.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_PRODUCT_IMAGE_BYTES)throw new Error('Choose a JPG, PNG or WebP image no larger than 5 MB.');
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const slug=($('adminProductSlug').value.trim()||'product').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'product';
 const path=`${slug}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const {error}=await sb.storage.from(PRODUCT_IMAGE_BUCKET).upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
 if(error)throw new Error('Image upload blocked by Supabase Storage security (RLS): '+error.message+'. Run supabase/migrations/202610230009_store_media_and_category_fix.sql in the Supabase SQL Editor, then sign out and sign in again with '+STORE_ADMIN+'. Confirm Firebase ID-token forwarding is enabled in Supabase Auth Third-Party Auth if it still fails.');
 const {data}=sb.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
 return data.publicUrl;
}
$('adminProductForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN){setStatus('adminProductStatusMessage','Admin access required.',true);return;}
 setStatus('adminProductStatusMessage','Saving product and uploading image if selected…');
 const editingId=$('adminProductId').value;
 try{
  const imageUrl=await uploadProductImageIfSelected();
  const row={slug:$('adminProductSlug').value.trim().toLowerCase(),title:$('adminProductTitle').value.trim(),category:$('adminProductCategory').value,curriculum:$('adminProductCurriculum').value||null,class_level:$('adminProductClass').value||null,subject:$('adminProductSubject').value||null,career_area:$('adminProductCareer').value||null,price:Number($('adminProductPrice').value),currency:'KES',audience:$('adminProductAudience').value.trim()||null,preview_image_url:imageUrl,preview_url:$('adminProductPreview').value.trim()||null,license_type:$('adminProductLicense').value,short_description:$('adminProductShort').value.trim(),description:$('adminProductDescription').value.trim()||null,status:$('adminProductStatus').value,featured:false,updated_at:new Date().toISOString()};
  let result;
  if(editingId){result=await sb.from('store_products').update(row).eq('id',editingId);}
  else{result=await sb.from('store_products').insert({...row,created_by:firebaseUser.email});}
  if(result.error)throw result.error;
  resetAdminProductForm();setStatus('adminProductStatusMessage',editingId?'Product updated successfully.':'Product added successfully. Published products appear in the public catalogue.');
  await loadProducts();
  await loadAdminProducts();
 }catch(err){setStatus('adminProductStatusMessage',err.message||'Could not save product.',true);}
});
async function loadAdminProducts(){
 if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)return;
 const {data,error}=await sb.from('store_products').select('id,title,slug,category,curriculum,class_level,subject,career_area,status,price,currency').order('created_at',{ascending:false}).limit(200);
 if(error){$('adminProductList').textContent='Unable to load product list: '+error.message;return;}
 $('adminProductList').innerHTML=(data||[]).map(p=>`<article class="admin-product-row"><div><strong>${esc(p.title)}</strong><p>${money(p.price,p.currency)} · ${esc(p.status)} · ${esc(p.category)}${p.class_level?' · '+esc(p.class_level.replace(/-/g,' ')):''}${p.subject?' · '+esc(p.subject.replace(/-/g,' ')):''}</p></div><div class="admin-product-actions"><button type="button" class="store-share" data-edit-product="${esc(p.id)}">Edit</button><button type="button" class="store-share" data-toggle-product="${esc(p.id)}" data-next-status="${p.status==='published'?'draft':'published'}">${p.status==='published'?'Unpublish':'Publish'}</button><button type="button" class="store-share" data-delete-product="${esc(p.id)}" data-product-title="${esc(p.title)}" aria-label="Delete ${esc(p.title)}">Delete</button></div></article>`).join('')||'<p>No products yet. Use the form above to add your first resource.</p>';
}
document.addEventListener('click',async e=>{
 const deleteButton=e.target.closest('[data-delete-product]');
 if(deleteButton){
  if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN){setStatus('adminProductStatusMessage','Admin access required.',true);return;}
  const productTitle=deleteButton.dataset.productTitle||'this product';
  if(!window.confirm(`Delete "${productTitle}" from the catalogue? This cannot be undone. Existing order records will be retained.`))return;
  deleteButton.disabled=true;
  try{
   const {error}=await sb.from('store_products').delete().eq('id',deleteButton.dataset.deleteProduct);
   if(error)throw error;
   await loadProducts();await loadAdminProducts();
   setStatus('adminProductStatusMessage',`Deleted "${productTitle}" from the catalogue.`);
  }catch(err){setStatus('adminProductStatusMessage',err.message||'Could not delete product.',true);deleteButton.disabled=false;}
  return;
 }
 const edit=e.target.closest('[data-edit-product]');
 if(edit){
  if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN){setStatus('adminProductStatusMessage','Admin access required.',true);return;}
  const {data,error}=await sb.from('store_products').select('*').eq('id',edit.dataset.editProduct).single();
  if(error||!data){setStatus('adminProductStatusMessage',error?.message||'Could not load this product.',true);return;}
  $('adminProductId').value=data.id;$('adminProductTitle').value=data.title||'';$('adminProductSlug').value=data.slug||'';$('adminProductCategory').value=data.category||'revision';$('adminProductPrice').value=data.price??0;$('adminProductAudience').value=data.audience||'';$('adminProductCurriculum').value=data.curriculum||'';$('adminProductClass').value=data.class_level||'';$('adminProductSubject').value=data.subject||'';$('adminProductCareer').value=data.career_area||'';$('adminProductImage').value=data.preview_image_url||'';$('adminProductImageFile').value='';if(data.preview_image_url){$('adminProductImagePreview').src=data.preview_image_url;$('adminProductImagePreview').hidden=false;}else{$('adminProductImagePreview').src=DEFAULT_PRODUCT_IMAGE;$('adminProductImagePreview').hidden=false;}$('adminProductPreview').value=data.preview_url||'';$('adminProductLicense').value=data.license_type||'single_user';$('adminProductShort').value=data.short_description||'';$('adminProductDescription').value=data.description||'';$('adminProductStatus').value=data.status||'draft';
  delete $('adminProductSlug').dataset.edited;$('adminProductSaveButton').textContent='Update product';$('adminProductCancelEdit').hidden=false;$('adminCatalogueDetails').open=true;$('adminProductForm').scrollIntoView({behavior:'smooth',block:'start'});setStatus('adminProductStatusMessage','Editing product: '+data.title);return;
 }
 const b=e.target.closest('[data-toggle-product]');if(!b)return;if(!firebaseUser||firebaseUser.email?.toLowerCase()!==STORE_ADMIN)return;
 try{const {error}=await sb.from('store_products').update({status:b.dataset.nextStatus,updated_at:new Date().toISOString()}).eq('id',b.dataset.toggleProduct);if(error)throw error;await loadProducts();await loadAdminProducts();setStatus('adminProductStatusMessage','Product visibility updated.');}catch(err){setStatus('adminProductStatusMessage',err.message||'Could not update product.',true);}
});

$('storeAdminLoginButton').addEventListener('click',async()=>{
 if(firebaseUser){if(firebaseUser.email?.toLowerCase()===STORE_ADMIN){try{await signOut(auth);setStatus('storeAdminLoginStatus','Admin signed out.');}catch(err){setStatus('storeAdminLoginStatus',err.message||'Could not sign out.',true);}return;}try{await signOut(auth);}catch{}}
 try{setStatus('storeAdminLoginStatus','Opening secure Google sign-in…');await signInWithPopup(auth,new GoogleAuthProvider());}
 catch(err){setStatus('storeAdminLoginStatus',err.code==='auth/popup-closed-by-user'?'Sign-in was cancelled.':(err.message||'Admin sign-in failed.'),true);}
});
onAuthStateChanged(auth,async user=>{firebaseUser=user;const authorised=!!user&&user.email?.toLowerCase()===STORE_ADMIN;$('storeAdminPanel').hidden=!authorised;$('storeAdminLoginButton').textContent=authorised?'Sign out admin':'Admin sign in';if(authorised){$('storeAdminIdentity').textContent='Signed in as authorised admin: '+user.email;setStatus('storeAdminLoginStatus','Admin access confirmed.');await loadAdminProducts();await loadAdminQueue();await loadAdminYoutubeVideos();}else if(user){setStatus('storeAdminLoginStatus','Signed in as '+(user.email||'an account')+'. This account is not authorised to manage the catalogue.',true);} });
loadProducts();
loadCuratedYoutubeVideos();
