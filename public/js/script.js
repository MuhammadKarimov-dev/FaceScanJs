const video = document.getElementById('videoInput')

Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models') //heavier/accurate version of tiny face detector
]).then(start)

function start() {
    document.body.append('Dastur Ishlayapti | ')
    
    navigator.getUserMedia(
        { video:{} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
    
    recognizeFaces()
}

async function recognizeFaces() {
    const labeledDescriptors = await loadLabeledImages()
    console.log(labeledDescriptors)
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.7)

    video.addEventListener('play', async () => {
        console.log('Playing')
        const canvas = faceapi.createCanvasFromMedia(video)
        document.body.append(canvas)

        const displaySize = { width: video.width, height: video.height }
        faceapi.matchDimensions(canvas, displaySize)

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()

            const resizedDetections = faceapi.resizeResults(detections, displaySize)

            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

            const results = resizedDetections.map((d) => {
                return faceMatcher.findBestMatch(d.descriptor)
            })
            
            results.forEach((result, i) => {
                const box = resizedDetections[i].detection.box
                const matchPercentage = (100 - result.distance * 100).toFixed(2)

                // Agar o'xshashlik foizi 30% dan past bo'lsa, yuzni chizmasin va ko'rsatmasin
                if (matchPercentage >= 30) {
                    // Agar o'xshashlik foizi 55% dan oshsa, tasdiqlash xabarini ko'rsatish
                    if (matchPercentage >= 55) {
                        setTimeout(() => {
                            alert(`Tastiqlangan: ${result.label} (${matchPercentage}%)`)  
                        }, 2000)
                    }

                    // Yuzni faqat 30% dan yuqori bo'lsa chizish
                    const drawBox = new faceapi.draw.DrawBox(box, { label: `${result.label} (${matchPercentage}%)` })
                    drawBox.draw(canvas)
                }
                // Agar o'xshashlik foizi 30% dan kam bo'lsa, hech qanday chizma va xabar ko'rsatilmasin
            })
        }, 100)
    })
}

function loadLabeledImages() {
    const labels = [ 'Jim Rhodes', 'Black Widow', "Captain America"]
    return Promise.all(
        labels.map(async (label) => {
            const descriptions = []
            for (let i = 1; i <= 2; i++) {
                const img = await faceapi.fetchImage(`../labeled_images/${label}/${i}.jpg`)
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                console.log(label + i + JSON.stringify(detections))
                descriptions.push(detections.descriptor)
            }
            document.body.append(label + '| Yuzlar Qidirlaypti ')
            return new faceapi.LabeledFaceDescriptors(label, descriptions)
        })
    )
}