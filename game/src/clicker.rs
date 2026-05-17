use js_sys::{Function, JSON, Reflect};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Element, HtmlElement, MessageEvent, WebSocket};

use std::cell::Cell;
use std::cell::RefCell;

fn call_ui_sound(sound: &str) {
    if let Some(win) = web_sys::window() {
        if let Ok(f) = Reflect::get(&win, &JsValue::from("playUISound")) {
            if let Some(func) = f.dyn_ref::<Function>() {
                let _ = func.call1(&win, &JsValue::from(sound));
            }
        }
    }
}

fn fmt_num(n: u64) -> String {
    let s = n.to_string();
    let mut out = String::with_capacity(s.len() + s.len() / 3);
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    out
}

struct ClickerState {
    pending_clicks: Cell<u32>,
    score_el: RefCell<Option<Element>>,
    timer_handle: Cell<Option<i32>>,
    socket: RefCell<Option<WebSocket>>,
    ws_url: String,
    api_base: String,
}

thread_local! {
    static STATE: ClickerState = ClickerState {
        pending_clicks: Cell::new(0),
        score_el: RefCell::new(None),
        timer_handle: Cell::new(None),
        socket: RefCell::new(None),
        ws_url: "wss://echopoint.ujjwalvivek.com/v1/click".to_string(),
        api_base: "https://echopoint.ujjwalvivek.com".to_string(),
    };
}

pub fn init_clicker(mount_selector: &str) {
    let window = match web_sys::window() {
        Some(w) => w,
        None => return,
    };
    let document = match window.document() {
        Some(d) => d,
        None => return,
    };
    let mount_node = match document.query_selector(mount_selector).ok().flatten() {
        Some(el) => el,
        None => return,
    };

    mount_node.set_inner_html(
        r#"<div class="clicker-box">
            <div class="clicker-row">
                <div class="clicker-info">
                    <div class="clicker-line">
                        <span class="prompt">$</span>
                        <span>./global --count</span>
                    </div>
                    <div id="globalClickScore" class="clicker-score">...</div>
                </div>
                <button class="clicker-btn" id="globalClickBtn">CLICK ME</button>
            </div>
        </div>"#,
    );

    let score_el = document.get_element_by_id("globalClickScore");
    if score_el.is_none() {
        return;
    }

    STATE.with(|s| {
        *s.score_el.borrow_mut() = score_el;
    });

    let ws_url = STATE.with(|s| s.ws_url.clone());
    if let Ok(socket) = WebSocket::new(&ws_url) {
        let stored = socket.clone();
        STATE.with(|s| {
            *s.socket.borrow_mut() = Some(stored);
        });

        let on_msg = Closure::<dyn FnMut(MessageEvent)>::new(move |e: MessageEvent| {
            if let Some(text) = e.data().as_string() {
                if let Ok(val) = JSON::parse(&text) {
                    use js_sys::Reflect;
                    if let Ok(global) = Reflect::get(&val, &JsValue::from("global")) {
                        if let Some(n) = global.as_f64() {
                            STATE.with(|st| {
                                if let Some(el) = st.score_el.borrow().as_ref() {
                                    el.set_text_content(Some(&fmt_num(n as u64)));
                                }
                            });
                        }
                    }
                }
            }
        });
        socket.set_onmessage(Some(on_msg.as_ref().unchecked_ref()));
        on_msg.forget();
    }

    if let Some(btn) = document.get_element_by_id("globalClickBtn") {
        let win = window.clone();
        let doc = document.clone();

        let click_closure = Closure::<dyn FnMut()>::new(move || {
            call_ui_sound("click");
            STATE.with(|s| {
                let pending = s.pending_clicks.get() + 1;
                s.pending_clicks.set(pending);

                if let Some(el) = s.score_el.borrow().as_ref() {
                    if let Some(text) = el.text_content() {
                        let clean: String = text.chars().filter(|c| c.is_ascii_digit()).collect();
                        if let Ok(n) = clean.parse::<u64>() {
                            el.set_text_content(Some(&fmt_num(n + 1)));
                        }
                    }
                }

                let doc_for_anim = doc.clone();
                let reset_anim = Closure::once(move || {
                    if let Some(el) = doc_for_anim.get_element_by_id("globalClickBtn") {
                        if let Some(html) = el.dyn_ref::<HtmlElement>() {
                            let _ = html.style().set_property("transform", "");
                        }
                    }
                });
                if let Some(btn_el) = doc.get_element_by_id("globalClickBtn") {
                    if let Some(html) = btn_el.dyn_ref::<HtmlElement>() {
                        let _ = html.style().set_property("transform", "scale(0.97)");
                    }
                    if let Ok(handle) = win
                        .set_timeout_with_callback_and_timeout_and_arguments_0(
                            reset_anim.as_ref().unchecked_ref(),
                            100,
                        )
                    {
                        reset_anim.forget();
                        let _ = handle;
                    }
                }

                if let Some(old) = s.timer_handle.get() {
                    win.clear_timeout_with_handle(old);
                }

                let win_for_flush = win.clone();
                let flush = Closure::once(move || {
                    let count = STATE.with(|st| {
                        let c = st.pending_clicks.get();
                        st.pending_clicks.set(0);
                        c
                    });
                    if count == 0 {
                        return;
                    }
                    let body = format!(r#"{{"type":"click","count":{}}}"#, count);

                    let sent = STATE.with(|st| {
                        if let Some(sock) = st.socket.borrow().as_ref() {
                            if sock.ready_state() == 1 {
                                sock.send_with_str(&body).is_ok()
                            } else {
                                false
                            }
                        } else {
                            false
                        }
                    });

                    if !sent {
                        let opts = web_sys::RequestInit::new();
                        opts.set_method("POST");
                        opts.set_body(&JsValue::from_str(&body));
                        let headers = web_sys::Headers::new().unwrap();
                        let _ = headers.set("Content-Type", "application/json");
                        opts.set_headers(&JsValue::from(headers));
                        let url = format!("{}/v1/click", STATE.with(|st| st.api_base.clone()));
                        if let Ok(request) =
                            web_sys::Request::new_with_str_and_init(&url, &opts)
                        {
                            let _ = win_for_flush.fetch_with_request(&request);
                        }
                    }
                });
                if let Ok(handle) = win.set_timeout_with_callback_and_timeout_and_arguments_0(
                    flush.as_ref().unchecked_ref(),
                    300,
                ) {
                    flush.forget();
                    s.timer_handle.set(Some(handle));
                }
            });
        });
        let target: &web_sys::EventTarget = btn.as_ref();
        target
            .add_event_listener_with_callback("click", click_closure.as_ref().unchecked_ref())
            .ok();
        click_closure.forget();

        let hover_closure = Closure::<dyn FnMut()>::new(move || {
            call_ui_sound("hover");
        });
        target
            .add_event_listener_with_callback(
                "mouseenter",
                hover_closure.as_ref().unchecked_ref(),
            )
            .ok();
        hover_closure.forget();
    }
}
