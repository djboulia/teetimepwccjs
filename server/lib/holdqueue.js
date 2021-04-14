/**
 * implement a FIFO queue for managing held tee times
 */
var HoldQueue = function () {
    const queue = [];

    this.isEmpty = function () {
        return queue.length === 0;
    }

    this.remove = function () {
        if (this.isEmpty()) {
            return null;
        } else {
            return queue.shift();
        }
    };

    this.add = function (session, json, slot) {
        queue.push({
            session: session,
            json: json,
            slot: slot
        });

        // hold times could come in out of order, so we sort
        // such that closest time to our request is at the top of the queue
        queue.sort(function (a, b) {
            const aTime = a.slot.date.getTime();
            const bTime = b.slot.date.getTime();

            if (aTime > bTime) {
                return 1;
            } else if (bTime > aTime) {
                return -1;
            } else {
                return 0;
            }
        });

        // print the order so we can see it
        console.log('hold queue: ' + this.toString());
    };

    this.toString = function() {
        let result = 'length: ' + queue.length + '\n';

        for (let i=0; i<queue.length; i++) {
            const item = queue[i];
            const slot = item.slot;

            result += 'item ' + i + ': ' + slot.toString() + '\n';
        }

        return result;
    };
};

module.exports = HoldQueue;