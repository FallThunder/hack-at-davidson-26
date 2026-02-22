<script lang="ts">
    import logo from "$lib/assets/evident-nobg.png";
</script>

<div class="min-w-screen min-h-screen flex flex-row align-middle justify-center items-center">
    <div class="flex flex-col gap-4 bg-white/20 border-white rounded-xl p-4">
        <div class="flex-1 flex flex-row gap-4 items-center justify-center align-middle">
            <img src={logo} alt="logo" class="w-32 h-32" />
            <div class="flex flex-col gap-1 text-center">
                <h1 class="text-2xl font-bold font-sans">Evident</h1>
                <h2 class="text-xl font-semibold font-sans">See. Know. Trust.</h2>
            </div>
        </div>

        <p class="font-semibold text-center">Evident is a browser extension for Chrome and Firefox (and derivatives) <br> that automatically analyzes news articles in-browser for factual accuracy and bias.</p>

        <div class="flex flex-row gap-2 items-center justify-center">
            <a class="bg-white px-4 py-2 text-black font-semibold" href="https://github.com/FallThunder/hack-at-davidson-26/releases/download/v2.3.0/evident-chrome.zip">Download for Chrome</a>
            <a class="bg-white px-4 py-2 text-black font-semibold" href="https://github.com/FallThunder/hack-at-davidson-26/releases/download/v2.3.0/evident-firefox.zip">Download for Firefox</a>
        </div>
    </div>
</div>

